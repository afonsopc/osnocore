"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDesktopStore } from "@/lib/store";
import { getWSClient } from "@/lib/ws-client";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  command: string;
  marker: string;
}

const STEPS: SetupStep[] = [
  {
    id: "claude",
    title: "Install Claude Code",
    description: "Install the Claude Code CLI and authenticate",
    icon: "◈",
    command: "bash /app/scripts/setup-claude.sh; exit",
    marker: "/tmp/setup-claude",
  },
  {
    id: "ssh-key",
    title: "SSH Key",
    description: "Generate a new SSH key or paste your existing one",
    icon: "🔐",
    command: "bash /app/scripts/setup-ssh.sh; exit",
    marker: "/tmp/setup-ssh",
  },
  {
    id: "github",
    title: "Login to GitHub",
    description: "Install GitHub CLI and authenticate",
    icon: "⬡",
    command: "bash /app/scripts/setup-github.sh; exit",
    marker: "/tmp/setup-github",
  },
  {
    id: "git-config",
    title: "Configure Git",
    description: "Set your name and email for commits",
    icon: "⚙",
    command: "bash /app/scripts/setup-git.sh; exit",
    marker: "/tmp/setup-git",
  },
];

type StepStatus = "pending" | "running" | "done" | "failed";

interface SetupProps {
  windowId: string;
}

export function Setup({ windowId }: SetupProps) {
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>(() =>
    Object.fromEntries(STEPS.map((s) => [s.id, "pending"]))
  );
  const closeWindow = useDesktopStore((s) => s.closeWindow);
  const openWindow = useDesktopStore((s) => s.openWindow);
  const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    return () => {
      pollTimers.current.forEach((t) => clearInterval(t));
    };
  }, []);

  const pollMarker = useCallback((step: SetupStep) => {
    const timer = setInterval(() => {
      const ws = getWSClient();
      const unsub = ws.onMessage((msg) => {
        if (msg.type === "terminal:created") {
          const sid = msg.sessionId;
          let output = "";
          const outUnsub = ws.onMessage((m) => {
            if (m.type === "terminal:output" && m.sessionId === sid) {
              output += m.data;
            }
          });
          setTimeout(() => {
            ws.send({ type: "terminal:input", sessionId: sid, data: `cat ${step.marker} 2>/dev/null; exit\n` });
          }, 200);
          setTimeout(() => {
            outUnsub();
            const clean = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
            if (clean.includes("DONE") || clean.includes("FAIL")) {
              const status = clean.includes("DONE") ? "done" : "failed";
              setStatuses((prev) => ({ ...prev, [step.id]: status }));
              const t = pollTimers.current.get(step.id);
              if (t) { clearInterval(t); pollTimers.current.delete(step.id); }
            }
          }, 600);
          unsub();
        }
      });
      ws.send({ type: "terminal:create", workspaceId: "default" });
    }, 3000);
    pollTimers.current.set(step.id, timer);
  }, []);

  const runStep = useCallback((step: SetupStep) => {
    setStatuses((prev) => ({ ...prev, [step.id]: "running" }));
    openWindow("terminal");

    const ws = getWSClient();
    const unsub = ws.onMessage((msg) => {
      if (msg.type === "terminal:created") {
        setTimeout(() => {
          ws.send({ type: "terminal:input", sessionId: msg.sessionId, data: step.command + "\n" });
        }, 500);
        unsub();
      }
    });

    pollMarker(step);
  }, [openWindow, pollMarker]);

  const allDone = Object.values(statuses).every((s) => s === "done" || s === "failed");

  return (
    <div className="flex flex-col h-full" style={{ background: "#11111b" }}>
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-lg font-medium text-[var(--color-text)]">
          Welcome to MestreOS
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Set up your development environment.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <div className="flex flex-col gap-2">
          {STEPS.map((step) => {
            const status = statuses[step.id];
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  status === "done"
                    ? "border-green-500/30 bg-green-500/5"
                    : status === "failed"
                    ? "border-red-500/30 bg-red-500/5"
                    : status === "running"
                    ? "border-indigo-500/50 bg-indigo-500/10"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-muted)]"
                }`}
              >
                <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 text-sm"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  {status === "done" ? (
                    <span className="text-green-400">✓</span>
                  ) : status === "failed" ? (
                    <span className="text-red-400">✗</span>
                  ) : (
                    <span>{step.icon}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--color-text)]">{step.title}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {step.description}
                  </div>
                </div>

                {status === "pending" && (
                  <button
                    className="px-3 py-1 rounded text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors shrink-0"
                    onClick={() => runStep(step)}
                  >
                    Run
                  </button>
                )}
                {status === "running" && (
                  <span className="text-xs text-indigo-300 shrink-0 animate-pulse">Running...</span>
                )}
                {status === "done" && (
                  <span className="text-xs text-green-400 shrink-0">Done</span>
                )}
                {status === "failed" && (
                  <button
                    className="px-3 py-1 rounded text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors shrink-0"
                    onClick={() => {
                      setStatuses((prev) => ({ ...prev, [step.id]: "pending" }));
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end items-center">
        <button
          className="px-4 py-1.5 rounded text-xs bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
          onClick={() => {
            if (allDone) localStorage.setItem("mestreos:setup-done", "true");
            closeWindow(windowId);
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
