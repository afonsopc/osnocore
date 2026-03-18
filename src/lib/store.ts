import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type { WindowState } from "./types";

interface DesktopState {
  windows: WindowState[];
  activeWindowId: string | null;
  nextZIndex: number;
  contextMenu: { x: number; y: number } | null;

  openWindow: (
    type: WindowState["type"],
    meta?: WindowState["meta"]
  ) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindow: (id: string, update: Partial<WindowState>) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  restoreWindow: (id: string) => void;
  setWindows: (windows: WindowState[]) => void;
  setContextMenu: (pos: { x: number; y: number } | null) => void;
}

const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 480;

export const useDesktopStore = create<DesktopState>((set, get) => ({
  windows: [],
  activeWindowId: null,
  nextZIndex: 1,
  contextMenu: null,

  openWindow: (type, meta) => {
    const id = uuid();
    const { nextZIndex, windows } = get();
    const offset = (windows.length % 8) * 30;
    const newWindow: WindowState = {
      id,
      type,
      title: type === "terminal" ? "Terminal" : type === "browser" ? (meta?.url ? new URL(meta.url).hostname : "Browser") : type === "setup" ? "Setup" : type === "auth" ? "Authentication" : "Settings",
      x: type === "auth" ? Math.round((typeof window !== "undefined" ? window.innerWidth : 1200) / 2 - 220) : 100 + offset,
      y: type === "auth" ? Math.round((typeof window !== "undefined" ? window.innerHeight : 800) / 2 - 180) : 60 + offset,
      width: type === "auth" ? 440 : DEFAULT_WIDTH,
      height: type === "auth" ? 360 : DEFAULT_HEIGHT,
      minimized: false,
      maximized: false,
      zIndex: nextZIndex,
      meta,
    };
    set({
      windows: [...windows, newWindow],
      activeWindowId: id,
      nextZIndex: nextZIndex + 1,
    });
    return id;
  },

  closeWindow: (id) => {
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
      activeWindowId:
        state.activeWindowId === id ? null : state.activeWindowId,
    }));
  },

  focusWindow: (id) => {
    const { nextZIndex } = get();
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, zIndex: nextZIndex, minimized: false } : w
      ),
      activeWindowId: id,
      nextZIndex: nextZIndex + 1,
    }));
  },

  updateWindow: (id, update) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, ...update } : w
      ),
    }));
  },

  minimizeWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, minimized: true } : w
      ),
      activeWindowId:
        state.activeWindowId === id ? null : state.activeWindowId,
    }));
  },

  toggleMaximize: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, maximized: !w.maximized } : w
      ),
    }));
  },

  restoreWindow: (id) => {
    const { nextZIndex } = get();
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id
          ? { ...w, minimized: false, zIndex: nextZIndex }
          : w
      ),
      activeWindowId: id,
      nextZIndex: nextZIndex + 1,
    }));
  },

  setWindows: (windows) => {
    const maxZ = windows.reduce((max, w) => Math.max(max, w.zIndex), 0);
    set({ windows, nextZIndex: maxZ + 1 });
  },

  setContextMenu: (pos) => set({ contextMenu: pos }),
}));
