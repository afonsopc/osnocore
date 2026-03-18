"use client";

import { useState, useRef, useEffect } from "react";
import { useDesktopStore } from "@/lib/store";
import { getWSClient } from "@/lib/ws-client";

interface PasswordPromptProps {
  windowId: string;
  askpassId?: string;
  prompt?: string;
}

export function PasswordPrompt({ windowId, askpassId, prompt }: PasswordPromptProps) {
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const closeWindow = useDesktopStore((s) => s.closeWindow);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = () => {
    if (!askpassId) return;
    getWSClient().send({ type: "sudo:response", id: askpassId, password });
    closeWindow(windowId);
  };

  const handleCancel = () => {
    if (askpassId) {
      getWSClient().send({ type: "sudo:cancel", id: askpassId });
    }
    closeWindow(windowId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") handleCancel();
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#11111b" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-indigo-400">
            <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.5" fill="currentColor" />
          </svg>
        </div>

        <div className="text-sm text-[var(--color-text)] mb-1">Authentication Required</div>
        <div className="text-xs text-[var(--color-text-muted)] mb-5 text-center">
          {prompt || "An application is requesting administrator access."}
        </div>

        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Password"
          className="w-full max-w-[260px] bg-[var(--color-surface)] text-sm text-[var(--color-text)] px-4 py-2.5 rounded-lg border border-[var(--color-border)] outline-none focus:border-indigo-500/50 text-center"
          autoComplete="off"
        />
      </div>

      <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)]">
        <button
          className="px-4 py-1.5 rounded text-xs bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          className="px-4 py-1.5 rounded text-xs bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
          onClick={handleSubmit}
        >
          Authenticate
        </button>
      </div>
    </div>
  );
}
