import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILES = ["problems.json","progress.json","sheets.json","topics.json","patterns.json","streaks.json","contests.json","settings.json"];
export async function GET() {
  const backup: Record<string, unknown> = {};
  for (const file of DATA_FILES) { try { backup[file] = JSON.parse(await fs.promises.readFile(path.join(DATA_DIR, file), "utf-8")); } catch { backup[file] = null; } }
  return new NextResponse(JSON.stringify(backup, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="dsa-tracker-backup-${new Date().toISOString().split("T")[0]}.json"` } });
}
