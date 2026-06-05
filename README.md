# osnoCORE

A browser-based desktop environment. It runs a full dev workspace inside a single Docker container, with draggable windows, persistent terminals, an integrated browser, and a first-run setup wizard, all accessible from your browser.

Under the hood it's a Next.js frontend talking to a WebSocket server that spawns real shells via `node-pty`, with Redis for state and supervisord keeping everything alive.

## Getting started

You need Docker.

For local development (hot reload, source bind-mounted):

```bash
docker compose --profile dev up
```

For production on Linux (requires [Sysbox](https://github.com/nestybox/sysbox) for isolated Docker-in-Docker):

```bash
docker compose -f docker-compose.yml -f docker-compose.sysbox.yml --profile prod up
```

Then open [http://localhost:3000](http://localhost:3000).

On first launch a setup wizard walks you through installing Claude Code and configuring SSH, GitHub CLI, and Git. You can optionally pass an `ANTHROPIC_API_KEY` through the environment.
