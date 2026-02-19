import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve, dirname } from "node:path";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawPath = searchParams.get("path") || homedir();
  const resolvedPath = resolve(rawPath);

  try {
    const pathStat = await stat(resolvedPath);
    if (!pathStat.isDirectory()) {
      return NextResponse.json(
        { error: "Path is not a directory" },
        { status: 400 },
      );
    }
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "EACCES") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Path not found" }, { status: 404 });
  }

  try {
    const dirEntries = await readdir(resolvedPath, { withFileTypes: true });

    const entries = dirEntries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => ({
        name: e.name,
        path: resolve(resolvedPath, e.name),
      }));

    const parent = dirname(resolvedPath);

    return NextResponse.json({
      path: resolvedPath,
      parent: parent === resolvedPath ? null : parent,
      entries,
    });
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "EACCES") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to read directory" },
      { status: 500 },
    );
  }
}
