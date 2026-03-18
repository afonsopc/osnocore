"use client";

import { useState, useRef, useCallback } from "react";
import { useDesktopStore } from "@/lib/store";

interface BrowserProps {
  windowId: string;
  initialUrl?: string;
}

export function Browser({ windowId, initialUrl }: BrowserProps) {
  const [url, setUrl] = useState(initialUrl || "");
  const [inputValue, setInputValue] = useState(initialUrl || "");
  const [loading, setLoading] = useState(!!initialUrl);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const updateWindow = useDesktopStore((s) => s.updateWindow);

  const navigate = useCallback((newUrl: string) => {
    let normalized = newUrl.trim();
    if (normalized && !normalized.match(/^https?:\/\//)) {
      normalized = "https://" + normalized;
    }
    setUrl(normalized);
    setInputValue(normalized);
    setLoading(true);
    setError(false);
    try {
      const hostname = new URL(normalized).hostname;
      updateWindow(windowId, { title: hostname });
    } catch {
    }
  }, [windowId, updateWindow]);

  const openExternal = useCallback(() => {
    if (url) window.open(url, "_blank");
  }, [url]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      navigate(inputValue);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-2 px-2 py-1.5 shrink-0"
        style={{
          background: "#181825",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <button
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-1"
          onClick={() => navigate(url)}
          title="Reload"
        >
          ↻
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-[var(--color-surface)] text-xs text-[var(--color-text)] px-3 py-1 rounded border border-[var(--color-border)] outline-none focus:border-indigo-500/50"
          placeholder="Enter URL..."
          spellCheck={false}
        />
        <button
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-1.5"
          onClick={openExternal}
          title="Open in browser (with cookies/sessions)"
        >
          ↗
        </button>
      </div>

      <div className="flex-1 relative">
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)] z-10">
            <span className="text-xs text-[var(--color-text-muted)]">Loading...</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-surface)] z-10 gap-3">
            <span className="text-xs text-[var(--color-text-muted)]">
              This site can&apos;t be loaded in an embedded frame.
            </span>
            <button
              className="text-xs px-3 py-1.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
              onClick={openExternal}
            >
              Open in browser ↗
            </button>
          </div>
        )}
        {url && (
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0"
            style={{ background: "white" }}
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        )}
        {!url && (
          <div className="flex items-center justify-center h-full text-sm text-[var(--color-text-muted)]">
            Enter a URL above
          </div>
        )}
      </div>
    </div>
  );
}
