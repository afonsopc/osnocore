import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function GET() {
  try {
    const redis = getRedis();
    const ids = await redis.zrange("workspaces:list", 0, -1);

    const workspaces = await Promise.all(
      ids.map(async (id) => {
        const name = (await redis.get(`workspace:${id}:name`)) || "Untitled";
        const layoutStr = await redis.get(`workspace:${id}:layout`);
        const windows = layoutStr ? JSON.parse(layoutStr) : [];
        return { id, name, windows };
      })
    );

    if (workspaces.length === 0) {
      return NextResponse.json([
        { id: "default", name: "Desktop", windows: [] },
      ]);
    }

    return NextResponse.json(workspaces);
  } catch {
    return NextResponse.json([
      { id: "default", name: "Desktop", windows: [] },
    ]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name } = body;
    const redis = getRedis();
    await redis.connect().catch(() => {});

    const count = await redis.zcard("workspaces:list");
    await redis.zadd("workspaces:list", count, id);
    await redis.set(`workspace:${id}:name`, name);

    return NextResponse.json({ id, name, windows: [] });
  } catch {
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}
