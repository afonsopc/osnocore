FROM oven/bun:1 AS base

RUN apt-get update && apt-get install -y \
    supervisor \
    redis-server \
    sudo \
    build-essential \
    python3 \
    git \
    zsh \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash api && \
    useradd -m -s /bin/zsh user

COPY sudoers.d/api-user /etc/sudoers.d/api-user
RUN chmod 0440 /etc/sudoers.d/api-user

WORKDIR /app
COPY package.json bun.lock* ./

RUN bun install

COPY . .

RUN bun run build

COPY supervisord.conf /etc/supervisor/conf.d/osnocore.conf

RUN mkdir -p /var/run/redis && chown redis:redis /var/run/redis

RUN chown -R user:user /home/user

ENV IS_DOCKER=true
ENV NODE_ENV=production

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD curl -f http://localhost:3001/health || exit 1

COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
