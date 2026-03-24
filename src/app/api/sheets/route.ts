import { NextResponse } from "next/server";
import { readSheets, readProgress } from "@/lib/data";
export async function GET() {
  const [sheets, progress] = await Promise.all([readSheets(), readProgress()]);
  return NextResponse.json(sheets.map((sheet) => ({ ...sheet, totalProblems: sheet.problemIds.length, solved: sheet.problemIds.filter((id) => progress[id]?.status === "solved").length })));
}
