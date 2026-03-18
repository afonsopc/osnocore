import { NextRequest, NextResponse } from "next/server";
import { readFile, access } from "fs/promises";
import { join } from "path";

const ICON_SEARCH_DIRS = [
  "/usr/share/icons/hicolor/128x128/apps",
  "/usr/share/icons/hicolor/96x96/apps",
  "/usr/share/icons/hicolor/64x64/apps",
  "/usr/share/icons/hicolor/48x48/apps",
  "/usr/share/icons/hicolor/scalable/apps",
  "/usr/share/icons/hicolor/256x256/apps",
  "/usr/share/pixmaps",
];

const EXTENSIONS = ["png", "svg", "xpm"];

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  svg: "image/svg+xml",
  xpm: "image/x-xpixmap",
};

async function resolveIcon(name: string): Promise<{ path: string; ext: string } | null> {
  // If it's already an absolute path
  if (name.startsWith("/")) {
    try {
      await access(name);
      const ext = name.split(".").pop() || "png";
      return { path: name, ext };
    } catch {
      return null;
    }
  }

  // Search icon theme dirs
  for (const dir of ICON_SEARCH_DIRS) {
    for (const ext of EXTENSIONS) {
      const candidate = join(dir, `${name}.${ext}`);
      try {
        await access(candidate);
        return { path: candidate, ext };
      } catch {
        // continue
      }
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name || /[\/\\]/.test(name.replace(/^\//, ""))) {
    return new NextResponse(null, { status: 400 });
  }

  const resolved = await resolveIcon(name);
  if (!resolved) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readFile(resolved.path);
    const mime = MIME_TYPES[resolved.ext] || "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
