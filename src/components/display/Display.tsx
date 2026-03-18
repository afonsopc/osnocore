"use client";

import { AppLauncher } from "./AppLauncher";

interface DisplayProps {
  windowId: string;
}

export function Display({ windowId }: DisplayProps) {
  return (
    <div className="flex flex-col w-full h-full">
      <AppLauncher windowId={windowId} />
    </div>
  );
}
