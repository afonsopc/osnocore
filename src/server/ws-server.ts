import { createServer } from "http";
import { writeFileSync } from "fs";
import { spawn, ChildProcess } from "child_process";
import { WebSocketServer, WebSocket } from "ws";
import { terminalManager } from "./terminal-manager";

const PORT = parseInt(process.env.WS_PORT || "3001");

// --- XApp session manager ---
interface XAppSession {
  id: string;
  command: string;
  title: string;
  port: number;
  process: ChildProcess;
}

const xappSessions = new Map<string, XAppSession>();
let xappNextPort = 10001;
let xappIdCounter = 0;

function getAppTitle(command: string): string {
  const bin = command.split(/\s+/)[0];
  const name = (bin.split("/").pop() || bin).replace(/[^a-zA-Z0-9]/g, "");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function allocatePort(): number {
  const port = xappNextPort++;
  if (xappNextPort > 10099) xappNextPort = 10001;
  // Skip ports already in use
  while ([...xappSessions.values()].some((s) => s.port === port)) {
    const next = xappNextPort++;
    if (xappNextPort > 10099) xappNextPort = 10001;
    return next;
  }
  return port;
}

async function waitForPort(port: number, timeoutMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function launchXApp(command: string): Promise<XAppSession> {
  const port = allocatePort();
  const sessionId = `xapp-${++xappIdCounter}`;
  const title = getAppTitle(command);

  console.log(`[xapp] launching "${command}" on port ${port} (${sessionId})`);

  // Give chromium its own profile dir to avoid lock conflicts
  let childCommand = command;
  const bin = command.split(/\s+/)[0].split("/").pop() || "";
  if (bin === "chromium" || bin === "chromium-browser" || bin === "google-chrome") {
    childCommand = `${command} --user-data-dir=/tmp/chromium-${sessionId} --disable-gpu --disable-software-rasterizer --disable-dev-shm-usage`;
  }

  const child = spawn(
    "sudo",
    [
      "-u",
      "user",
      "bash",
      "-c",
      `xpra start --bind-ws=0.0.0.0:${port} --html=on --start-child="${childCommand}" --exit-with-children --no-daemon --no-notifications --no-mdns --speaker=yes --microphone=no --resize-display=1920x1080 --dpi=96 2>&1`,
    ],
    {
      env: {
        ...process.env,
        XDG_RUNTIME_DIR: "/tmp/xdg-runtime",
        HOME: "/home/user",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  const session: XAppSession = { id: sessionId, command, title, port, process: child };
  xappSessions.set(sessionId, session);

  child.stdout?.on("data", (data: Buffer) => {
    console.log(`[xapp:${sessionId}] ${data.toString().trim()}`);
  });

  child.stderr?.on("data", (data: Buffer) => {
    console.log(`[xapp:${sessionId}:err] ${data.toString().trim()}`);
  });

  child.on("exit", (code) => {
    console.log(`[xapp] ${sessionId} exited with code ${code}`);
    xappSessions.delete(sessionId);
    broadcast({ type: "xapp:closed", sessionId });
  });

  // Wait for xpra to be ready before returning
  console.log(`[xapp] waiting for xpra on port ${port}...`);
  const ready = await waitForPort(port);
  if (!ready) {
    console.log(`[xapp] timeout waiting for xpra on port ${port}`);
  } else {
    console.log(`[xapp] xpra ready on port ${port}`);
  }

  return session;
}

function killXApp(sessionId: string) {
  const session = xappSessions.get(sessionId);
  if (!session) return;
  console.log(`[xapp] killing ${sessionId}`);
  try {
    // Kill the process group
    process.kill(-session.process.pid!, "SIGTERM");
  } catch {
    try {
      session.process.kill("SIGTERM");
    } catch {}
  }
}

function broadcast(data: object) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// --- HTTP server ---
const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200);
    res.end("ok");
    return;
  }

  if (req.method === "POST" && req.url === "/open") {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const { url } = JSON.parse(body);
        if (url) {
          console.log("[ws] browser:open", url);
          broadcast({ type: "browser:open", url });
        }
        res.writeHead(200);
        res.end("ok");
      } catch {
        res.writeHead(400);
        res.end("bad request");
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/askpass") {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const { id, prompt } = JSON.parse(body);
        if (id && /^askpass-[0-9]+-[0-9]+$/.test(id)) {
          console.log("[ws] sudo:prompt", id);
          pendingAskpass.set(id, `/tmp/${id}`);
          broadcast({ type: "sudo:prompt", id, prompt: prompt || "Password:" });
        }
        res.writeHead(200);
        res.end("ok");
      } catch {
        res.writeHead(400);
        res.end("bad request");
      }
    });
    return;
  }

  // HTTP endpoint for xlaunch script
  if (req.method === "POST" && req.url === "/xapp") {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", async () => {
      try {
        const { command } = JSON.parse(body);
        if (!command || typeof command !== "string") {
          res.writeHead(400);
          res.end("missing command");
          return;
        }
        const session = await launchXApp(command);
        broadcast({
          type: "xapp:opened",
          sessionId: session.id,
          command: session.command,
          port: session.port,
          title: session.title,
        });
        res.writeHead(200);
        res.end(JSON.stringify({ sessionId: session.id, port: session.port }));
      } catch (e) {
        console.error("[ws] /xapp failed:", e);
        res.writeHead(500);
        res.end("internal error");
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const pendingAskpass = new Map<string, string>();

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket) => {
  console.log("[ws] client connected");

  ws.on("message", (raw: Buffer | string) => {
    try {
      const msg = JSON.parse(typeof raw === "string" ? raw : raw.toString());
      handleMessage(ws, msg);
    } catch (e) {
      console.error("[ws] invalid message:", e);
      ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
    }
  });

  ws.on("close", () => {
    console.log("[ws] client disconnected");
    terminalManager.detachAll(ws);
  });
});

interface WSClient {
  send: (data: string) => void;
}

async function handleMessage(ws: WSClient, msg: { type: string; [key: string]: unknown }) {
  switch (msg.type) {
    case "terminal:create": {
      console.log("[ws] terminal:create for workspace:", msg.workspaceId);
      try {
        const session = terminalManager.create(msg.workspaceId as string);
        terminalManager.attach(session.id, ws);
        console.log("[ws] terminal created:", session.id);
        ws.send(
          JSON.stringify({
            type: "terminal:created",
            sessionId: session.id,
            workspaceId: msg.workspaceId,
          })
        );
      } catch (e) {
        console.error("[ws] terminal:create failed:", e);
        ws.send(JSON.stringify({ type: "error", message: String(e) }));
      }
      break;
    }

    case "terminal:input": {
      terminalManager.write(msg.sessionId as string, msg.data as string);
      break;
    }

    case "terminal:resize": {
      terminalManager.resize(msg.sessionId as string, msg.cols as number, msg.rows as number);
      break;
    }

    case "terminal:attach": {
      terminalManager.attach(msg.sessionId as string, ws);
      break;
    }

    case "terminal:detach": {
      terminalManager.detach(msg.sessionId as string, ws);
      break;
    }

    case "sudo:response": {
      const id = msg.id as string;
      const password = msg.password as string;
      const filePath = pendingAskpass.get(id);
      if (filePath) {
        try {
          writeFileSync(filePath, password, { mode: 0o644 });
          console.log("[ws] sudo:response written for", id);
        } catch (e) {
          console.error("[ws] sudo:response write failed:", e);
        }
        pendingAskpass.delete(id);
      }
      break;
    }

    case "sudo:cancel": {
      const cancelId = msg.id as string;
      const cancelPath = pendingAskpass.get(cancelId);
      if (cancelPath) {
        try {
          writeFileSync(cancelPath, "", { mode: 0o644 });
        } catch { }
        pendingAskpass.delete(cancelId);
      }
      break;
    }

    case "xapp:launch": {
      const command = msg.command as string;
      if (!command || typeof command !== "string") {
        ws.send(JSON.stringify({ type: "xapp:error", message: "Missing command" }));
        break;
      }
      console.log("[ws] xapp:launch:", command);
      try {
        const session = await launchXApp(command);
        broadcast({
          type: "xapp:opened",
          sessionId: session.id,
          command: session.command,
          port: session.port,
          title: session.title,
        });
      } catch (e) {
        console.error("[ws] xapp:launch failed:", e);
        ws.send(JSON.stringify({ type: "xapp:error", message: String(e) }));
      }
      break;
    }

    case "xapp:close": {
      const sessionId = msg.sessionId as string;
      if (sessionId) {
        killXApp(sessionId);
      }
      break;
    }

    case "layout:update": {
      break;
    }

    case "workspace:subscribe": {
      break;
    }

    default: {
      ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
    }
  }
}

httpServer.listen(PORT, () => {
  console.log(`[ws-server] listening on port ${PORT}`);
});
