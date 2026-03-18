import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";

interface DesktopApp {
  name: string;
  exec: string;
  icon: string;
}

function parseExecBinary(execLine: string): string {
  let bin = execLine;
  // Strip leading env VAR=val prefixes
  while (bin.startsWith("env ") || /^[A-Z_]+=\S+\s/.test(bin)) {
    bin = bin.replace(/^env\s+/, "");
    bin = bin.replace(/^[A-Z_]+=\S+\s+/, "");
  }
  // Take first token, strip field codes (%u, %U, %f, %F, etc.)
  bin = bin.split(/\s+/)[0];
  // If full path, take basename
  return basename(bin);
}

function parseDesktop(content: string): DesktopApp | null {
  // Only parse the [Desktop Entry] section
  const lines = content.split("\n");
  let inEntry = false;
  let name = "";
  let exec = "";
  let icon = "";
  let type = "";
  let noDisplay = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) {
      inEntry = trimmed === "[Desktop Entry]";
      if (!inEntry && name) break; // done with main section
      continue;
    }
    if (!inEntry) continue;

    if (trimmed.startsWith("Name=") && !name) name = trimmed.slice(5);
    else if (trimmed.startsWith("Exec=") && !exec) exec = trimmed.slice(5);
    else if (trimmed.startsWith("Icon=") && !icon) icon = trimmed.slice(5);
    else if (trimmed.startsWith("Type=")) type = trimmed.slice(5);
    else if (trimmed.startsWith("NoDisplay=")) noDisplay = trimmed.slice(10).toLowerCase() === "true";
  }

  if (!name || !exec || type !== "Application" || noDisplay) return null;

  const bin = parseExecBinary(exec);
  if (!bin) return null;

  return { name, exec: bin, icon: icon || bin };
}

export async function GET() {
  try {
    const desktopDir = "/usr/share/applications";
    const files = await readdir(desktopDir).catch(() => [] as string[]);

    const apps: DesktopApp[] = [];
    const seenBins = new Set<string>();

    for (const file of files) {
      if (!file.endsWith(".desktop")) continue;
      try {
        const content = await readFile(join(desktopDir, file), "utf-8");
        const app = parseDesktop(content);
        if (app && !seenBins.has(app.exec)) {
          seenBins.add(app.exec);
          apps.push(app);
        }
      } catch {
        // skip unreadable files
      }
    }

    apps.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(apps);
  } catch {
    return NextResponse.json([]);
  }
}
