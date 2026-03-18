"use client";

import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import { getWSClient } from "@/lib/ws-client";
import { useDesktopStore } from "@/lib/store";
import type { WSServerMessage } from "@/lib/types";

interface TerminalProps {
  windowId: string;
  sessionId?: string;
}

export function Terminal({ windowId, sessionId: initialSessionId }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | undefined>(initialSessionId);
  const createdRef = useRef(false);
  const updateWindow = useDesktopStore((s) => s.updateWindow);

  const handleResize = useCallback(() => {
    const fit = fitAddonRef.current;
    const term = termRef.current;
    if (!fit || !term) return;

    try {
      fit.fit();
      const sid = sessionIdRef.current;
      if (sid) {
        getWSClient().send({
          type: "terminal:resize",
          sessionId: sid,
          cols: term.cols,
          rows: term.rows,
        });
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      theme: {
        background: "#1e1e2e",
        foreground: "#cdd6f4",
        cursor: "#f5e0dc",
        selectionBackground: "#585b7066",
        black: "#45475a",
        red: "#f38ba8",
        green: "#a6e3a1",
        yellow: "#f9e2af",
        blue: "#89b4fa",
        magenta: "#f5c2e7",
        cyan: "#94e2d5",
        white: "#bac2de",
        brightBlack: "#585b70",
        brightRed: "#f38ba8",
        brightGreen: "#a6e3a1",
        brightYellow: "#f9e2af",
        brightBlue: "#89b4fa",
        brightMagenta: "#f5c2e7",
        brightCyan: "#94e2d5",
        brightWhite: "#a6adc8",
      },
      allowProposedApi: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.attachCustomKeyEventHandler((event) => {
      if (event.type === "keydown" && event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.key.length === 1) {
          const sid = sessionIdRef.current;
          if (sid) {
            getWSClient().send({ type: "terminal:input", sessionId: sid, data: event.key });
          }
          return false;
        }
      }
      return true;
    });

    term.open(containerRef.current);

    term.registerLinkProvider({
      provideLinks(lineNumber, callback) {
        const buffer = term.buffer.active;
        const bufLine = lineNumber - 1;

        const currentText = buffer.getLine(bufLine)?.translateToString(true).trim() || "";

        const hasUrlStart = /https?:\/\//.test(currentText);
        const looksLikeUrlContinuation = /^[^\s"'<>]*[a-zA-Z0-9%&=_\-/.?#:+]/.test(currentText) && !currentText.startsWith(" ");

        if (!hasUrlStart && !looksLikeUrlContinuation) {
          callback(undefined);
          return;
        }

        let startLine = bufLine;
        while (startLine > 0) {
          const prev = buffer.getLine(startLine - 1);
          if (!prev) break;
          const prevText = prev.translateToString(true).trim();
          if (!prevText || /^\s*$/.test(prevText)) break;
          if (prev.isWrapped || /https?:\/\//.test(prevText) || /[a-zA-Z0-9%&=_\-/.?#:+]$/.test(prevText)) {
            startLine--;
          } else {
            break;
          }
        }

        let endLine = bufLine;
        while (endLine < buffer.length - 1) {
          const next = buffer.getLine(endLine + 1);
          if (!next) break;
          const nextText = next.translateToString(true).trim();
          if (!nextText || /^\s*$/.test(nextText)) break;
          if (next.isWrapped || /^[^\s"'<>]*[a-zA-Z0-9%&=_\-/.?#:+]/.test(nextText)) {
            endLine++;
          } else {
            break;
          }
        }

        const lineTexts: { line: number; text: string; trimmedStart: number }[] = [];
        for (let i = startLine; i <= endLine; i++) {
          const line = buffer.getLine(i);
          if (!line) continue;
          const raw = line.translateToString(true);
          const trimmed = raw.trim();
          const trimmedStart = raw.indexOf(trimmed.charAt(0));
          lineTexts.push({
            line: i,
            text: trimmed,
            trimmedStart: trimmedStart >= 0 ? trimmedStart : 0,
          });
        }

        const joined = lineTexts.map((l) => l.text).join("");

        const urlRegex = /https?:\/\/[^\s"'<>)\]]+/g;
        let match;
        const links = [];

        while ((match = urlRegex.exec(joined)) !== null) {
          const url = match[0];

          let charCount = 0;
          let startPos = { x: 1, y: startLine + 1 };
          let endPos = { x: 1, y: endLine + 1 };

          for (const lt of lineTexts) {
            const lineStart = charCount;
            const lineEnd = charCount + lt.text.length;

            if (match.index >= lineStart && match.index < lineEnd) {
              const offsetInLine = match.index - lineStart;
              startPos = { x: lt.trimmedStart + offsetInLine + 1, y: lt.line + 1 };
            }

            const matchEndIdx = match.index + url.length - 1;
            if (matchEndIdx >= lineStart && matchEndIdx < lineEnd) {
              const offsetInLine = matchEndIdx - lineStart;
              endPos = { x: lt.trimmedStart + offsetInLine + 2, y: lt.line + 1 };
            }

            charCount += lt.text.length;
          }

          if (lineNumber >= startPos.y && lineNumber <= endPos.y) {
            links.push({
              text: url,
              range: { start: startPos, end: endPos },
              activate(event: MouseEvent) {
                if (event.metaKey || event.ctrlKey) {
                  window.open(url, "_blank");
                }
              },
            });
          }
        }
        callback(links.length ? links : undefined);
      },
    });

    try {
      const webglAddon = new WebglAddon();
      term.loadAddon(webglAddon);
    } catch {
    }

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    requestAnimationFrame(() => {
      try {
        if (containerRef.current && containerRef.current.clientWidth > 0) {
          fitAddon.fit();
        }
      } catch {
      }
    });

    const ws = getWSClient();

    const handleMessage = (msg: WSServerMessage) => {
      if (msg.type === "terminal:output" && msg.sessionId === sessionIdRef.current) {
        term.write(msg.data);
      }
      if (msg.type === "terminal:created" && !sessionIdRef.current) {
        sessionIdRef.current = msg.sessionId;
        updateWindow(windowId, {
          meta: { terminalSessionId: msg.sessionId },
        });
        ws.send({
          type: "terminal:resize",
          sessionId: msg.sessionId,
          cols: term.cols,
          rows: term.rows,
        });
      }
      if (msg.type === "terminal:exited" && msg.sessionId === sessionIdRef.current) {
        term.writeln("\r\n\x1b[90m[Process exited]\x1b[0m");
      }
    };

    const unsubscribe = ws.onMessage(handleMessage);

    const inputDisposable = term.onData((data) => {
      const sid = sessionIdRef.current;
      if (sid) {
        ws.send({ type: "terminal:input", sessionId: sid, data });
      }
    });

    if (!initialSessionId && !createdRef.current) {
      createdRef.current = true;
      ws.send({ type: "terminal:create", workspaceId: "default" });
    } else if (initialSessionId) {
      ws.send({ type: "terminal:attach", sessionId: initialSessionId });
    }

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => handleResize());
    });
    observer.observe(containerRef.current);

    return () => {
      inputDisposable.dispose();
      unsubscribe();
      observer.disconnect();
      if (sessionIdRef.current) {
        ws.send({ type: "terminal:detach", sessionId: sessionIdRef.current });
      }
      term.dispose();
    };
  }, [windowId, initialSessionId, handleResize, updateWindow]);

  return (
    <div
      ref={containerRef}
      className="xterm-container"
      style={{ background: "#1e1e2e" }}
    />
  );
}
