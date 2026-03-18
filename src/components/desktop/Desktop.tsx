"use client";

import { useEffect, useCallback, useRef } from "react";
import { useDesktopStore } from "@/lib/store";
import { getWSClient } from "@/lib/ws-client";
import { Window } from "./Window";
import { Dock } from "./Dock";
import { ContextMenu } from "./ContextMenu";

export function Desktop() {
  const windows = useDesktopStore((s) => s.windows);
  const contextMenu = useDesktopStore((s) => s.contextMenu);
  const setContextMenu = useDesktopStore((s) => s.setContextMenu);

  const openWindow = useDesktopStore((s) => s.openWindow);

  const setupOpened = useRef(false);

  useEffect(() => {
    if (setupOpened.current) return;
    const done = localStorage.getItem("osnocore:setup-done");
    if (!done) {
      setupOpened.current = true;
      openWindow("setup");
    }
  }, [openWindow]);

  useEffect(() => {
    const ws = getWSClient();
    ws.connect();

    const unsub = ws.onMessage((msg) => {
      if (msg.type === "browser:open") {
        window.open(msg.url, "_blank");
      }
      if (msg.type === "sudo:prompt") {
        openWindow("auth", { askpassId: msg.id, askpassPrompt: msg.prompt });
      }
    });

    return () => {
      unsub();
      ws.disconnect();
    };
  }, [openWindow]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [setContextMenu]
  );

  const handleClick = useCallback(() => {
    setContextMenu(null);
  }, [setContextMenu]);

  return (
    <div
      className="fixed inset-0 select-none"
      style={{
        background: "#0f0f1a",
        paddingBottom: 0,
      }}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url(/wallpaper.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {windows.map((win) => (
        <Window key={win.id} window={win} />
      ))}

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} />
      )}

      <Dock />
    </div>
  );
}
