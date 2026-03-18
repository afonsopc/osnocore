# osnoCORE

Browser-based desktop environment. Single Docker container running a full dev workspace with draggable windows, persistent terminals, and integrated tooling.

## Stack

- **Runtime:** Bun (Next.js, frontend) + Node (WebSocket server, node-pty)
- **Frontend:** Next.js 15, React 19, Tailwind CSS 4, zustand, react-rnd, xterm.js
- **Backend:** WebSocket server (ws) on port 3001, Next.js on port 3000
- **Terminal:** node-pty spawning shells as `user` via `sudo -u user -i`
- **Infrastructure:** supervisord, Redis, Docker-in-Docker (Sysbox for prod)

## Architecture

```
Container (Docker)
├── supervisord
├── Redis (state persistence)
├── Next.js :3000 (frontend + API) — runs as "api" user
├── WebSocket server :3001 (terminals + events) — runs as "api" user
└── Terminal processes (node-pty → sudo -u user) — runs as "user"
```

Two system users: `api` (runs servers) and `user` (runs shells). The `api` user has NOPASSWD sudo to `user`. The `user` has password-based sudo to root (password prompt appears as a GUI modal).

## Key Directories

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components (desktop, terminal, browser, setup, settings, auth)
- `src/lib/` — Shared code (store, types, WebSocket client, Redis client)
- `src/server/` — WebSocket server and terminal manager (runs on Node, not Next.js)
- `scripts/` — Shell scripts (entrypoint, setup wizards, sudo askpass, browser opener)

## WebSocket Protocol

Single connection per tab on port 3001. Messages are JSON with a `type` field.

Client sends: `terminal:create`, `terminal:input`, `terminal:resize`, `terminal:attach`, `terminal:detach`, `sudo:response`, `sudo:cancel`

Server sends: `terminal:output`, `terminal:created`, `terminal:exited`, `browser:open`, `sudo:prompt`, `error`

## Docker

- **Dev (macOS):** `docker compose --profile dev up` — bind mounts source, hot reload, Docker socket from host
- **Prod (Linux + Sysbox):** `docker compose -f docker-compose.yml -f docker-compose.sysbox.yml --profile prod up` — isolated Docker daemon per container

## Custom Integrations

- **sudo askpass:** `SUDO_ASKPASS` points to a script that POSTs to the WS server, which opens a password modal in the frontend
- **Browser opener:** `BROWSER` env var points to a script that sends URLs to the frontend via WS server, opening them in the user's real browser
- **Setup wizard:** First-run setup with scripts in `scripts/setup-*.sh` that install Claude Code, configure SSH, GitHub CLI, and Git
