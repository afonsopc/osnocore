"use client";

import { useMemo } from "react";
import { useDesktopStore } from "@/lib/store";
import type { WindowState } from "@/lib/types";
import {
  TerminalIcon,
  BrowserIcon,
  SetupIcon,
  SettingsIcon,
} from "@/components/icons/AppIcons";

interface DockApp {
  type: WindowState["type"];
  label: string;
  icon: React.ReactNode;
}

const DOCK_APPS: DockApp[] = [
  { type: "terminal", label: "Terminal", icon: <TerminalIcon size={22} /> },
  { type: "browser", label: "Browser", icon: <BrowserIcon size={22} /> },
  { type: "setup", label: "Setup", icon: <SetupIcon size={22} /> },
  { type: "settings", label: "Settings", icon: <SettingsIcon size={22} /> },
];

export function Dock() {
  const windows = useDesktopStore((s) => s.windows);
  const activeWindowId = useDesktopStore((s) => s.activeWindowId);
  const { openWindow, focusWindow, restoreWindow, minimizeWindow } =
    useDesktopStore();

  const windowsByType = useMemo(() => {
    const map = new Map<string, WindowState[]>();
    for (const win of windows) {
      const list = map.get(win.type) || [];
      list.push(win);
      map.set(win.type, list);
    }
    return map;
  }, [windows]);

  const handleAppClick = (app: DockApp) => {
    const appWindows = windowsByType.get(app.type);

    if (!appWindows || appWindows.length === 0) {
      openWindow(app.type);
      return;
    }

    if (appWindows.length === 1) {
      const win = appWindows[0];
      if (win.minimized) {
        restoreWindow(win.id);
      } else if (activeWindowId === win.id) {
        minimizeWindow(win.id);
      } else {
        focusWindow(win.id);
      }
      return;
    }

    const activeIdx = appWindows.findIndex((w) => w.id === activeWindowId);
    if (activeIdx !== -1) {
      const next = appWindows[(activeIdx + 1) % appWindows.length];
      if (next.minimized) {
        restoreWindow(next.id);
      } else {
        focusWindow(next.id);
      }
    } else {
      const visible = appWindows.find((w) => !w.minimized);
      if (visible) {
        focusWindow(visible.id);
      } else {
        restoreWindow(appWindows[0].id);
      }
    }
  };

  return (
    <div
      className="fixed bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-1 p-2 rounded-2xl"
      style={{
        background: "rgba(17, 17, 27, 0.75)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(20px)",
        zIndex: 99999,
      }}
    >
      {DOCK_APPS.map((app) => {
        const appWindows = windowsByType.get(app.type) || [];
        const hasOpen = appWindows.length > 0;
        const isActive = appWindows.some(
          (w) => w.id === activeWindowId && !w.minimized,
        );

        return (
          <button
            key={app.type}
            className="group relative flex flex-col items-center"
            onClick={() => handleAppClick(app)}
            title={app.label}
          >
            <span className="absolute -top-8 px-2 py-0.5 rounded text-[10px] text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {app.label}
            </span>

            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-150 ${
                isActive
                  ? "bg-indigo-500/25 text-indigo-300 scale-105"
                  : "bg-white/5 text-(--color-text-muted) hover:bg-white/10 hover:text-(--color-text) hover:scale-110"
              }`}
            >
              {app.icon}
            </div>

            <div className="flex gap-0.5 mt-0.5 h-1 absolute -bottom-1.75">
              {hasOpen && appWindows.length <= 3 ? (
                appWindows.map((w) => (
                  <div
                    key={w.id}
                    className={`size-0.75 rounded-full ${
                      w.id === activeWindowId && !w.minimized
                        ? "bg-indigo-400"
                        : "bg-(--color-text-muted)"
                    }`}
                  />
                ))
              ) : hasOpen ? (
                <div className="w-1 h-1 rounded-full bg-[var(--color-text-muted)]" />
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
