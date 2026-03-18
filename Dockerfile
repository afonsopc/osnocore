FROM debian:bookworm AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update
RUN apt-get install -y \
    supervisor \
    redis-server \
    nginx \
    sudo \
    build-essential \
    python3 \
    git \
    zsh \
    curl \
    gnupg \
    unzip \
    nodejs \
    npm \
    xvfb \
    chromium \
    dbus \
    dbus-x11 \
    libgl1-mesa-dri \
    xterm \
    docker.io \
    docker-compose \
    pulseaudio \
    gstreamer1.0-pulseaudio \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    fontconfig

RUN curl -fsSL https://xpra.org/get-xpra.sh | bash
RUN apt-get install -y xpra xpra-html5
RUN apt-get update && apt-get install -y matchbox-window-manager xdotool
RUN rm -rf /var/lib/apt/lists/*

ENV BUN_INSTALL=/usr/local
RUN curl -fsSL https://bun.sh/install | bash

RUN useradd -m -s /bin/bash api
RUN useradd -m -s /bin/zsh user

COPY sudoers.d/api-user /etc/sudoers.d/api-user
RUN chmod 0440 /etc/sudoers.d/api-user

WORKDIR /app
COPY package.json bun.lock* ./

RUN bun install

COPY . .

RUN bun run build

COPY supervisord.conf /etc/supervisor/conf.d/osnocore.conf

RUN rm -f /etc/nginx/sites-enabled/default
COPY nginx.conf /etc/nginx/conf.d/osnocore.conf

RUN mkdir -p /var/run/redis && chown redis:redis /var/run/redis
RUN mkdir -p /tmp/xdg-runtime && chown user:user /tmp/xdg-runtime
RUN mkdir -p /run/user/1001 && chmod 700 /run/user/1001 && chown user:user /run/user/1001
RUN mkdir -p /var/run/dbus && chown messagebus:messagebus /var/run/dbus
RUN mkdir -p /home/user/.cache/fontconfig && chown -R user:user /home/user/.cache
RUN fc-cache -f 2>/dev/null || true
RUN echo "Content-Security-Policy: script-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; child-src 'self'; worker-src 'self' blob:; frame-ancestors *; form-action 'self'; media-src 'self' blob: data:" > /etc/xpra/http-headers/10_content_security_policy.txt
COPY xpra-override.css /usr/share/xpra/www/css/xpra-override.css
RUN sed -i 's|</head>|<link rel="stylesheet" href="css/xpra-override.css" /></head>|' /usr/share/xpra/www/index.html \
    && rm -f /usr/share/xpra/www/index.html.br /usr/share/xpra/www/index.html.gz

RUN chown -R user:user /home/user

ENV IS_DOCKER=true
ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD curl -f http://localhost:3001/health || exit 1

COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
