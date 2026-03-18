"use client";

import { useState, useEffect } from "react";

const TIPS = [
  "Right-click the desktop to open apps",
  "Cmd+Click URLs in the terminal to open them",
  "Drag window edges to resize them",
  "Double-click the title bar to maximize",
  "The dock shows a dot for each open window",
  "Your SSH keys persist between restarts",
  "Run 'claude' in the terminal for AI coding",
  "Terminal sessions survive page reloads",
  "Click a dock icon to cycle through windows",
];

export function Loading({ onReady }: { onReady: () => void }) {
  const [progress, setProgress] = useState(0);
  const [tip, setTip] = useState(TIPS[0]);
  const [phase, setPhase] = useState("Initializing");
  const [dots, setDots] = useState("");

  useEffect(() => {
    const t = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const phases = [
      { at: 10, label: "Starting services" },
      { at: 30, label: "Connecting to backend" },
      { at: 55, label: "Loading desktop" },
      { at: 75, label: "Preparing terminal" },
      { at: 90, label: "Almost ready" },
    ];

    let current = 0;
    const t = setInterval(() => {
      current += Math.random() * 8 + 2;
      if (current > 100) current = 100;
      setProgress(current);

      const phase = [...phases].reverse().find((p) => current >= p.at);
      if (phase) setPhase(phase.label);

      if (current >= 100) {
        clearInterval(t);
        setTimeout(onReady, 400);
      }
    }, 200);

    return () => clearInterval(t);
  }, [onReady]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: "#0a0a14" }}>
      <div className="mb-10">
        <div className="text-3xl font-light tracking-widest text-[var(--color-text)]">
          osno<span className="text-indigo-400">CORE</span>
        </div>
      </div>

      <div className="w-64 mb-4">
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #6366f1, #818cf8)",
            }}
          />
        </div>
      </div>

      <div className="text-xs text-[var(--color-text-muted)] mb-8 h-4">
        {phase}{dots}
      </div>

      <div className="absolute bottom-12 text-[11px] text-[var(--color-text-muted)] opacity-50 transition-opacity duration-500">
        💡 {tip}
      </div>
    </div>
  );
}
