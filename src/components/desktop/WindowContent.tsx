"use client";

import dynamic from "next/dynamic";
import type { WindowState } from "@/lib/types";
import { Browser } from "@/components/browser/Browser";
import { Setup } from "@/components/setup/Setup";
import { Settings } from "@/components/settings/Settings";
import { PasswordPrompt } from "@/components/auth/PasswordPrompt";
import { Display } from "@/components/display/Display";

const Terminal = dynamic(() => import("@/components/terminal/Terminal").then(m => m.Terminal), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
      Loading...
    </div>
  ),
});

interface WindowContentProps {
  window: WindowState;
}

export function WindowContent({ window: win }: WindowContentProps) {
  switch (win.type) {
    case "terminal":
      return <Terminal windowId={win.id} sessionId={win.meta?.terminalSessionId} />;
    case "browser":
      return <Browser windowId={win.id} initialUrl={win.meta?.url} />;
    case "setup":
      return <Setup windowId={win.id} />;
    case "auth":
      return <PasswordPrompt windowId={win.id} askpassId={win.meta?.askpassId} prompt={win.meta?.askpassPrompt} />;
    case "settings":
      return <Settings windowId={win.id} />;
    case "display":
      return <Display windowId={win.id} />;
    case "xapp": {
      const xpraPort = win.meta?.xpraPort;
      if (!xpraPort) return null;
      const xpraUrl = `/xpra/${xpraPort}/?sharing=true&keyboard=true&clipboard=true&sound=true&printing=false&floating_menu=false&swap_keys=false&open_url=false&keyboard_layout=us&soft_keyboard=false&header=false&path=/xpra/${xpraPort}`;
      return (
        <iframe
          src={xpraUrl}
          className="w-full h-full border-0"
          allow="clipboard-read; clipboard-write"
        />
      );
    }
    default:
      return null;
  }
}
