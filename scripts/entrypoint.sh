#!/bin/bash
set -e

echo "Starting osnoCORE..."

chown -R user:user /home/user

echo "user:osnocore" | chpasswd

if [ ! -d /home/user/.oh-my-zsh ]; then
  echo "Setting up oh-my-zsh for user..."
  su - user -c 'sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended'
  su - user -c 'git clone https://github.com/zsh-users/zsh-autosuggestions /home/user/.oh-my-zsh/custom/plugins/zsh-autosuggestions 2>/dev/null || true'
  su - user -c 'git clone https://github.com/zsh-users/zsh-syntax-highlighting /home/user/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting 2>/dev/null || true'
  cat > /home/user/.zshrc << 'ZSHRC'
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="darkblood"
plugins=(git zsh-autosuggestions zsh-syntax-highlighting)
source $ZSH/oh-my-zsh.sh

export PATH="$HOME/.local/bin:$PATH"

HISTSIZE=999999999
SAVEHIST=$HISTSIZE

alias c="claude --dangerously-skip-permissions"
ZSHRC
  chown user:user /home/user/.zshrc
fi

grep -q 'BROWSER=' /home/user/.zshenv 2>/dev/null || \
  echo 'export BROWSER=/app/scripts/open-browser.sh' >> /home/user/.zshenv
grep -q 'SUDO_ASKPASS=' /home/user/.zshenv 2>/dev/null || \
  echo 'export SUDO_ASKPASS=/app/scripts/sudo-askpass.sh' >> /home/user/.zshenv
chown user:user /home/user/.zshenv

mkdir -p /home/user/.local/bin
cp /app/scripts/sudo-wrapper.sh /home/user/.local/bin/sudo
chmod +x /home/user/.local/bin/sudo
chown user:user /home/user/.local/bin/sudo

cat > /etc/profile.d/osnocore.sh << 'PROFILE'
export PATH="$HOME/.local/bin:$PATH"
export SUDO_ASKPASS=/app/scripts/sudo-askpass.sh
export BROWSER=/app/scripts/open-browser.sh
PROFILE

if [ -S /var/run/docker.sock ]; then
  chmod 666 /var/run/docker.sock
  export OSNOCORE_DOCKER=socket
else
  getent group docker > /dev/null 2>&1 || groupadd docker
  usermod -aG docker user
  export OSNOCORE_DOCKER=sysbox
fi

if [ "$NODE_ENV" = "development" ] && [ -f /app/package.json ]; then
  echo "Installing dependencies..."
  cd /app
  bun install
fi

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/osnocore.conf
