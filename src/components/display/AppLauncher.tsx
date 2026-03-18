"use client";

import { useState } from "react";
import { getWSClient } from "@/lib/ws-client";

interface AppLauncherProps {
  windowId: string;
  onCollapse: () => void;
}

const QUICK_APPS = [
  { label: "XTerm", command: "xterm" },
  { label: "Chromium", command: "chromium --no-sandbox" },
];

export function AppLauncher({ windowId, onCollapse }: AppLauncherProps) {
  const [command, setCommand] = useState("");

  const launch = (cmd: string) => {
    if (!cmd.trim()) return;
    getWSClient().send({ type: "xapp:launch", command: cmd.trim() });
    setCommand("");
  };

  return (
    <div className="flex-none flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && launch(command)}
        placeholder="Command (e.g. gimp, firefox)"
        className="flex-1 px-2 py-1 text-xs bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded outline-none focus:border-indigo-500"
      />
      <button
        onClick={() => launch(command)}
        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500"
      >
        Launch
      </button>
      {QUICK_APPS.map((app) => (
        <button
          key={app.label}
          onClick={() => launch(app.command)}
          className="px-2 py-1 text-xs bg-white/5 text-[var(--color-text-muted)] rounded hover:bg-white/10 hover:text-[var(--color-text)]"
        >
          {app.label}
        </button>
      ))}
      <button
        onClick={onCollapse}
        className="px-1 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        title="Hide launcher"
      >
        ×
      </button>
    </div>
  );
}
