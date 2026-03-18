"use client";

import { useState, useCallback } from "react";
import { Desktop } from "@/components/desktop/Desktop";
import { Loading } from "@/components/desktop/Loading";

export default function Home() {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  if (!ready) {
    return <Loading onReady={handleReady} />;
  }

  return <Desktop />;
}
