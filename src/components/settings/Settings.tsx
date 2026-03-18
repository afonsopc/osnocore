"use client";

import { useState, useEffect, useCallback } from "react";
import { useDesktopStore } from "@/lib/store";
import { getWSClient } from "@/lib/ws-client";

interface SettingsProps {
  windowId: string;
}

export function Settings({ windowId }: SettingsProps) {
  const openWindow = useDesktopStore((s) => s.openWindow);
  const [sshKeys, setSshKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [showAddKey, setShowAddKey] = useState(false);

  const loadKeys = useCallback(() => {
    setLoading(true);
    const ws = getWSClient();

    const unsub = ws.onMessage((msg) => {
      if (msg.type === "terminal:created") {
        const sid = msg.sessionId;
        let output = "";

        const outputUnsub = ws.onMessage((m) => {
          if (m.type === "terminal:output" && m.sessionId === sid) {
            output += m.data;
          }
        });

        setTimeout(() => {
          ws.send({ type: "terminal:input", sessionId: sid, data: "ls ~/.ssh/*.pub 2>/dev/null && echo '---KEYS---' && cat ~/.ssh/*.pub 2>/dev/null; echo '---END---'\n" });
        }, 300);

        setTimeout(() => {
          outputUnsub();
          const keysMatch = output.match(/---KEYS---([\s\S]*?)---END---/);
          if (keysMatch) {
            const raw = keysMatch[1]
              .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
              .trim();
            const keys = raw.split("\n").filter((l) => l.startsWith("ssh-") || l.startsWith("ecdsa-"));
            setSshKeys(keys);
          } else {
            setSshKeys([]);
          }
          setLoading(false);
          ws.send({ type: "terminal:input", sessionId: sid, data: "exit\n" });
        }, 1000);

        unsub();
      }
    });

    ws.send({ type: "terminal:create", workspaceId: "default" });
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const addKey = useCallback(() => {
    if (!newKey.trim()) return;
    if (!/^(ssh-|ecdsa-)/.test(newKey.trim())) return;
    const ws = getWSClient();

    const unsub = ws.onMessage((msg) => {
      if (msg.type === "terminal:created") {
        const sid = msg.sessionId;
        setTimeout(() => {
          ws.send({
            type: "terminal:input",
            sessionId: sid,
            data: `mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys << 'SSHKEY'\n${newKey.trim()}\nSSHKEY\nchmod 600 ~/.ssh/authorized_keys && echo 'Key added'\n`,
          });
        }, 300);

        setTimeout(() => {
          ws.send({ type: "terminal:input", sessionId: sid, data: "exit\n" });
          setNewKey("");
          setShowAddKey(false);
          loadKeys();
        }, 800);

        unsub();
      }
    });

    ws.send({ type: "terminal:create", workspaceId: "default" });
  }, [newKey, loadKeys]);

  const generateKey = useCallback(() => {
    openWindow("terminal");
    const ws = getWSClient();
    const unsub = ws.onMessage((msg) => {
      if (msg.type === "terminal:created") {
        setTimeout(() => {
          ws.send({
            type: "terminal:input",
            sessionId: msg.sessionId,
            data: "ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519\n",
          });
        }, 500);
        unsub();
        setTimeout(() => loadKeys(), 5000);
      }
    });
  }, [openWindow, loadKeys]);

  return (
    <div className="flex flex-col h-full" style={{ background: "#11111b" }}>
      <div className="flex-1 overflow-y-auto p-6">
        <section className="mb-6">
          <h2 className="text-sm font-medium text-[var(--color-text)] mb-3">SSH Keys</h2>

          {loading ? (
            <div className="text-xs text-[var(--color-text-muted)]">Loading keys...</div>
          ) : sshKeys.length === 0 ? (
            <div className="text-xs text-[var(--color-text-muted)] mb-3">No SSH keys found.</div>
          ) : (
            <div className="flex flex-col gap-2 mb-3">
              {sshKeys.map((key, i) => {
                const parts = key.split(" ");
                const type = parts[0];
                const comment = parts.length > 2 ? parts.slice(2).join(" ") : "";
                const fingerprint = parts[1] ? parts[1].slice(0, 20) + "..." : "";

                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                  >
                    <div className="w-7 h-7 rounded flex items-center justify-center text-xs shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                      🔑
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[var(--color-text)] font-mono truncate">
                        {comment || type}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                        {type} {fingerprint}
                      </div>
                    </div>
                    <button
                      className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-2 py-0.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(key);
                      }}
                    >
                      Copy
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
              onClick={generateKey}
            >
              Generate new key
            </button>
            <button
              className="px-3 py-1.5 rounded text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
              onClick={() => setShowAddKey(!showAddKey)}
            >
              Add authorized key
            </button>
          </div>

          {showAddKey && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="ssh-ed25519 AAAA..."
                className="flex-1 bg-[var(--color-surface)] text-xs text-[var(--color-text)] px-3 py-1.5 rounded border border-[var(--color-border)] outline-none focus:border-indigo-500/50 font-mono"
                onKeyDown={(e) => e.key === "Enter" && addKey()}
              />
              <button
                className="px-3 py-1.5 rounded text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                onClick={addKey}
              >
                Add
              </button>
            </div>
          )}
        </section>

        <div className="border-t border-[var(--color-border)] my-4" />

        <section>
          <h2 className="text-sm font-medium text-[var(--color-text)] mb-2">Setup</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Run the initial setup wizard again to install tools or reconfigure.
          </p>
          <button
            className="px-3 py-1.5 rounded text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
            onClick={() => openWindow("setup")}
          >
            Open Setup
          </button>
        </section>
      </div>
    </div>
  );
}
