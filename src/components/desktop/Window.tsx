"use client";

import { useCallback, useRef } from "react";
import { Rnd } from "react-rnd";
import type { WindowState } from "@/lib/types";
import { useDesktopStore } from "@/lib/store";
import { WindowContent } from "./WindowContent";
import { TerminalIcon, BrowserIcon, SetupIcon, SettingsIcon } from "@/components/icons/AppIcons";

interface WindowProps {
  window: WindowState;
}

export function Window({ window: win }: WindowProps) {
  const { focusWindow, closeWindow, minimizeWindow, toggleMaximize, updateWindow } =
    useDesktopStore();
  const activeWindowId = useDesktopStore((s) => s.activeWindowId);
  const isActive = activeWindowId === win.id;
  const rndRef = useRef<Rnd>(null);

  const handleDragStop = useCallback(
    (_e: unknown, d: { x: number; y: number }) => {
      updateWindow(win.id, { x: d.x, y: d.y });
    },
    [win.id, updateWindow]
  );

  const handleResizeStop = useCallback(
    (
      _e: unknown,
      _dir: unknown,
      ref: HTMLElement,
      _delta: unknown,
      position: { x: number; y: number }
    ) => {
      updateWindow(win.id, {
        width: parseInt(ref.style.width),
        height: parseInt(ref.style.height),
        x: position.x,
        y: position.y,
      });
    },
    [win.id, updateWindow]
  );

  if (win.minimized) return null;

  const isMaximized = win.maximized;
  const position = isMaximized ? { x: 0, y: 0 } : { x: win.x, y: win.y };
  const size = isMaximized
    ? { width: typeof window !== "undefined" ? window.innerWidth : "100%", height: typeof window !== "undefined" ? window.innerHeight : "100%" }
    : { width: win.width, height: win.height };

  return (
    <Rnd
      ref={rndRef}
      position={position}
      size={size}
      minWidth={300}
      minHeight={200}
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
      dragHandleClassName="window-drag-handle"
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onMouseDown={() => focusWindow(win.id)}
      style={{ zIndex: win.zIndex }}
      bounds="parent"
    >
      <div
        className={`flex flex-col h-full rounded-lg overflow-hidden border ${
          isActive
            ? "border-indigo-500/50 shadow-lg shadow-indigo-500/10"
            : "border-[var(--color-border)] shadow-md"
        }`}
        style={{ background: "var(--color-surface)" }}
      >
        <div
          className="window-drag-handle flex items-center justify-between h-9 px-3 shrink-0"
          style={{
            background: isActive
              ? "linear-gradient(to right, #1e1e2e, #252540)"
              : "#1a1a2a",
            borderBottom: "1px solid var(--color-border)",
          }}
          onDoubleClick={() => toggleMaximize(win.id)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="opacity-60">
              {win.type === "terminal" ? <TerminalIcon size={12} /> : win.type === "browser" ? <BrowserIcon size={12} /> : win.type === "setup" ? <SetupIcon size={12} /> : <SettingsIcon size={12} />}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] truncate">
              {win.title}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                minimizeWindow(win.id);
              }}
              title="Minimize"
            />
            <button
              className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-400 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleMaximize(win.id);
              }}
              title="Maximize"
            />
            <button
              className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                closeWindow(win.id);
              }}
              title="Close"
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <WindowContent window={win} />
        </div>
      </div>
    </Rnd>
  );
}
