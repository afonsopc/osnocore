import { v4 as uuid } from "uuid";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pty = require("node-pty");

export interface TerminalSession {
  id: string;
  workspaceId: string;
  process: ReturnType<typeof pty.spawn>;
  clients: Set<{ send: (data: string) => void }>;
  title: string;
  createdAt: Date;
}

class TerminalManager {
  private sessions = new Map<string, TerminalSession>();

  create(workspaceId: string): TerminalSession {
    const id = uuid();

    const isDocker = process.env.IS_DOCKER === "true";
    const shell = isDocker ? "sudo" : process.env.SHELL || "/bin/zsh";
    const args = isDocker ? ["-u", "user", "-i"] : [];

    const proc = pty.spawn(shell, args, {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: isDocker ? "/home/user" : process.env.HOME,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
      },
    });

    const session: TerminalSession = {
      id,
      workspaceId,
      process: proc,
      clients: new Set(),
      title: "Terminal",
      createdAt: new Date(),
    };

    proc.onData((data: string) => {
      const msg = JSON.stringify({
        type: "terminal:output",
        sessionId: id,
        data,
      });
      session.clients.forEach((client) => {
        try {
          client.send(msg);
        } catch {
          session.clients.delete(client);
        }
      });

    });

    proc.onExit(({ exitCode }: { exitCode: number }) => {
      const msg = JSON.stringify({
        type: "terminal:exited",
        sessionId: id,
        exitCode,
      });
      session.clients.forEach((client) => {
        try {
          client.send(msg);
        } catch {
        }
      });
      this.sessions.delete(id);
    });

    this.sessions.set(id, session);
    return session;
  }

  get(id: string): TerminalSession | undefined {
    return this.sessions.get(id);
  }

  write(id: string, data: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.process.write(data);
    }
  }

  resize(id: string, cols: number, rows: number) {
    const session = this.sessions.get(id);
    if (session) {
      try {
        session.process.resize(cols, rows);
      } catch {
      }
    }
  }

  attach(id: string, client: { send: (data: string) => void }) {
    const session = this.sessions.get(id);
    if (session) {
      session.clients.add(client);
    }
  }

  detach(id: string, client: { send: (data: string) => void }) {
    const session = this.sessions.get(id);
    if (session) {
      session.clients.delete(client);
    }
  }

  kill(id: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.process.kill();
      this.sessions.delete(id);
    }
  }

  listSessions(): Array<{ id: string; workspaceId: string; title: string }> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      workspaceId: s.workspaceId,
      title: s.title,
    }));
  }

  detachAll(client: { send: (data: string) => void }) {
    this.sessions.forEach((session) => {
      session.clients.delete(client);
    });
  }
}

export const terminalManager = new TerminalManager();
