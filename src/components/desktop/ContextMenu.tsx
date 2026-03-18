"use client";

import { useDesktopStore } from "@/lib/store";
import {
  TerminalIcon,
  BrowserIcon,
  SettingsIcon,
} from "@/components/icons/AppIcons";

interface ContextMenuProps {
  x: number;
  y: number;
}

export function ContextMenu({ x, y }: ContextMenuProps) {
  const { openWindow, setContextMenu } = useDesktopStore();

  const items = [
    {
      label: "New Terminal",
      icon: <TerminalIcon size={13} />,
      action: () => openWindow("terminal"),
    },
    {
      label: "Browser",
      icon: <BrowserIcon size={13} />,
      action: () => openWindow("browser"),
    },
    { type: "separator" as const },
    {
      label: "Settings",
      icon: <SettingsIcon size={13} />,
      action: () => openWindow("settings"),
    },
  ];

  const handleClick = (action?: () => void) => {
    action?.();
    setContextMenu(null);
  };

  return (
    <div
      className="fixed rounded-lg overflow-hidden py-1 min-w-[180px] shadow-xl"
      style={{
        left: x,
        top: y,
        background: "rgba(30, 30, 46, 0.98)",
        border: "1px solid var(--color-border)",
        backdropFilter: "blur(12px)",
        zIndex: 100000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        "type" in item && item.type === "separator" ? (
          <div
            key={i}
            className="my-1 border-t border-[var(--color-border)]"
          />
        ) : (
          <button
            key={i}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left text-[var(--color-text-muted)] hover:bg-indigo-500/20 hover:text-[var(--color-text)] transition-colors"
            onClick={() => handleClick("action" in item ? item.action : undefined)}
          >
            {"icon" in item && (
              <span className="w-4 flex items-center justify-center">{item.icon}</span>
            )}
            {"label" in item && <span>{item.label}</span>}
          </button>
        )
      )}
    </div>
  );
}
