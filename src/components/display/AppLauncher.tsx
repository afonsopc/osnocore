"use client";

import { useState } from "react";
import { getWSClient } from "@/lib/ws-client";

interface AppLauncherProps {
  windowId: string;
}

const QUICK_APPS = [
  { label: "XTerm", command: "xterm" },
  { label: "Chromium", command: "chromium --no-sandbox" },
];

export function AppLauncher({ windowId }: AppLauncherProps) {
  const [command, setCommand] = useState("");

  const launch = (cmd: string) => {
    if (!cmd.trim()) return;
    getWSClient().send({ type: "xapp:launch", command: cmd.trim() });
    setCommand("");
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && launch(command)}
          placeholder="Command (e.g. gimp, firefox)"
          className="flex-1 px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => launch(command)}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
        >
          Launch
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_APPS.map((app) => (
          <button
            key={app.label}
            onClick={() => launch(app.command)}
            className="px-4 py-2 text-sm bg-white/5 text-[var(--color-text-muted)] rounded-lg hover:bg-white/10 hover:text-[var(--color-text)] border border-[var(--color-border)]"
          >
            {app.label}
          </button>
        ))}
      </div>
    </div>
  );
}
