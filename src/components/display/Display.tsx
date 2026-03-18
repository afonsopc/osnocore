"use client";

import { useState } from "react";
import { AppLauncher } from "./AppLauncher";

interface DisplayProps {
  windowId: string;
}

export function Display({ windowId }: DisplayProps) {
  const [showLauncher, setShowLauncher] = useState(true);
  const xpraUrl =
    typeof window !== "undefined"
      ? `/xpra/display/?sharing=true&keyboard=true&clipboard=true&sound=true&printing=false&reconnect=true&floating_menu=false&path=/xpra/display`
      : "";

  return (
    <div className="flex flex-col w-full h-full">
      {showLauncher && (
        <AppLauncher
          windowId={windowId}
          onCollapse={() => setShowLauncher(false)}
        />
      )}
      {!showLauncher && (
        <button
          className="flex-none px-2 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-surface)] border-b border-[var(--color-border)]"
          onClick={() => setShowLauncher(true)}
        >
          Show Launcher
        </button>
      )}
      <iframe
        src={xpraUrl}
        className="flex-1 w-full border-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
