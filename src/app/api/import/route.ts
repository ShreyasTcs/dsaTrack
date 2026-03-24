import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
const DATA_DIR = path.join(process.cwd(), "data");
const ALLOWED_FILES = new Set(["problems.json","progress.json","sheets.json","topics.json","patterns.json","streaks.json","contests.json","settings.json"]);
export async function POST(request: Request) {
  const backup = await request.json();
  for (const [filename, data] of Object.entries(backup)) {
    if (data !== null && ALLOWED_FILES.has(filename)) {
      const filePath = path.join(DATA_DIR, filename);
      await fs.promises.writeFile(filePath + ".tmp", JSON.stringify(data, null, 2), "utf-8");
      await fs.promises.rename(filePath + ".tmp", filePath);
    }
  }
  return NextResponse.json({ success: true });
}
