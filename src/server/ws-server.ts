import { createServer } from "http";
import { writeFileSync, chmodSync } from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { terminalManager } from "./terminal-manager";

const PORT = parseInt(process.env.WS_PORT || "3001");

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
          const msg = JSON.stringify({ type: "browser:open", url });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(msg);
            }
          });
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
          const msg = JSON.stringify({ type: "sudo:prompt", id, prompt: prompt || "Password:" });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(msg);
            }
          });
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

function handleMessage(ws: WSClient, msg: { type: string; [key: string]: unknown }) {
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
