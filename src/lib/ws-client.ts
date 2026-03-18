import type { WSMessage, WSServerMessage } from "./types";

type MessageHandler = (msg: WSServerMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private queue: WSMessage[] = [];
  private url: string;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;

  constructor() {
    this.url = typeof window !== "undefined"
      ? `ws://${window.location.hostname}:3001`
      : "";
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.ws?.readyState === WebSocket.CONNECTING) return;

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[ws] connected");
      this.readyResolve?.();
      for (const msg of this.queue) {
        this.ws!.send(JSON.stringify(msg));
      }
      this.queue = [];
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WSServerMessage = JSON.parse(event.data);
        this.handlers.forEach((h) => h(msg));
      } catch (e) {
        console.error("[ws] parse error:", e);
      }
    };

    this.ws.onclose = () => {
      console.log("[ws] disconnected, reconnecting in 2s...");
      this.readyPromise = null;
      this.reconnectTimer = setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = () => {
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.readyPromise = null;
    this.queue = [];
  }

  send(msg: WSMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.queue.push(msg);
    }
  }

  ready(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.readyPromise) return this.readyPromise;
    return new Promise((resolve) => {
      this.readyResolve = resolve;
    });
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

let client: WebSocketClient | null = null;

export function getWSClient(): WebSocketClient {
  if (!client) {
    client = new WebSocketClient();
  }
  return client;
}
