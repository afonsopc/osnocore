"use client";

import { useState, useEffect } from "react";
import { getWSClient } from "@/lib/ws-client";

interface AppLauncherProps {
  windowId: string;
}

interface DesktopApp {
  name: string;
  exec: string;
  icon: string;
}

export function AppLauncher({ windowId }: AppLauncherProps) {
  const [command, setCommand] = useState("");
  const [apps, setApps] = useState<DesktopApp[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/apps")
      .then((r) => r.json())
      .then((data) => setApps(data))
      .catch(() => {});
  }, []);

  const launch = (cmd: string) => {
    if (!cmd.trim()) return;
    getWSClient().send({ type: "xapp:launch", command: cmd.trim() });
    setCommand("");
  };

  const filtered = search
    ? apps.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : apps;

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && launch(command)}
          placeholder="Custom command (e.g. gimp --no-splash)"
          className="flex-1 px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => launch(command)}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
        >
          Launch
        </button>
      </div>

      {apps.length > 0 && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applications..."
            className="px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg outline-none focus:border-indigo-500"
          />
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
              {filtered.map((app) => (
                <button
                  key={app.exec}
                  onClick={() => launch(app.exec)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-white/10 transition-colors group"
                  title={app.name}
                >
                  <AppIcon icon={app.icon} name={app.name} />
                  <span className="text-[11px] leading-tight text-center text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] line-clamp-2 w-full">
                    {app.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AppIcon({ icon, name }: { icon: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const src = `/api/app-icon?name=${encodeURIComponent(icon)}`;

  if (failed) {
    return (
      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg font-semibold text-[var(--color-text-muted)]">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className="w-10 h-10 rounded-lg object-contain"
      onError={() => setFailed(true)}
    />
  );
}
