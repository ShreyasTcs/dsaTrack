import { NextResponse } from "next/server";
import { readPatterns, readProgress } from "@/lib/data";
export async function GET() {
  const [patterns, progress] = await Promise.all([readPatterns(), readProgress()]);
  return NextResponse.json(patterns.map((pattern) => ({ ...pattern, totalProblems: pattern.problemIds.length, solved: pattern.problemIds.filter((id) => progress[id]?.status === "solved").length })));
}
