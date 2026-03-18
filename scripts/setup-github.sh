#!/bin/bash

FRAMES=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')

spin() {
  local msg="$1"
  local pid="$2"
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${FRAMES[$((i % ${#FRAMES[@]}))]} %s" "$msg"
    i=$((i + 1))
    sleep 0.1
  done
  printf "\r                                          \r"
}

echo ""
echo "  ┌─────────────────────────────────┐"
echo "  │       GitHub CLI Setup          │"
echo "  └─────────────────────────────────┘"
echo ""

if ! command -v gh > /dev/null 2>&1; then
  (
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt-get update -qq > /dev/null 2>&1
    sudo apt-get install -y -qq gh > /dev/null 2>&1
  ) &
  PID=$!
  spin "Installing GitHub CLI" $PID

  if ! wait $PID; then
    echo FAIL > /tmp/setup-github
    exit 1
  fi
  echo "  ✓ GitHub CLI installed"
else
  echo "  ✓ GitHub CLI already installed"
fi

echo ""
echo "  Starting authentication..."
echo ""

if gh auth login; then
  echo DONE > /tmp/setup-github
else
  echo FAIL > /tmp/setup-github
  exit 1
fi
