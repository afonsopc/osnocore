export interface WindowState {
  id: string;
  type: "terminal" | "browser" | "setup" | "auth" | "settings" | "display" | "xapp";
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  meta?: {
    terminalSessionId?: string;
    url?: string;
    askpassId?: string;
    askpassPrompt?: string;
    xpraPort?: number;
    xappSessionId?: string;
  };
}

export interface Workspace {
  id: string;
  name: string;
  windows: WindowState[];
}

export type WSMessage =
  | { type: "terminal:create"; workspaceId: string }
  | { type: "terminal:input"; sessionId: string; data: string }
  | { type: "terminal:resize"; sessionId: string; cols: number; rows: number }
  | { type: "terminal:attach"; sessionId: string }
  | { type: "terminal:detach"; sessionId: string }
  | { type: "sudo:response"; id: string; password: string }
  | { type: "sudo:cancel"; id: string }
  | { type: "layout:update"; workspaceId: string; windows: WindowState[] }
  | { type: "workspace:subscribe"; workspaceId: string }
  | { type: "xapp:launch"; command: string }
  | { type: "xapp:close"; sessionId: string };

export type WSServerMessage =
  | { type: "terminal:output"; sessionId: string; data: string }
  | { type: "terminal:created"; sessionId: string; workspaceId: string }
  | { type: "terminal:exited"; sessionId: string; exitCode: number }
  | { type: "layout:changed"; workspaceId: string; windows: WindowState[] }
  | { type: "browser:open"; url: string }
  | { type: "sudo:prompt"; id: string; prompt: string }
  | { type: "xapp:opened"; sessionId: string; command: string; port: number; title: string }
  | { type: "xapp:closed"; sessionId: string }
  | { type: "xapp:error"; message: string }
  | { type: "error"; message: string };
