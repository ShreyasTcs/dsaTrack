import { NextRequest, NextResponse } from "next/server";
import { readProblems, readTopics, readSheets, readPatterns, readProgress } from "@/lib/data";
import { enrichProblems } from "@/lib/enrichProblems";
import { filterProblems } from "@/lib/api-helpers";
export async function GET(request: NextRequest) {
  const [problems, topics, sheets, patterns, progress] = await Promise.all([readProblems(), readTopics(), readSheets(), readPatterns(), readProgress()]);
  const enriched = enrichProblems(problems, topics, sheets, patterns);
  const params = request.nextUrl.searchParams;
  const filtered = filterProblems(enriched, progress, { topic: params.get("topic") || undefined, difficulty: params.get("difficulty") || undefined, pattern: params.get("pattern") || undefined, status: params.get("status") || undefined });
  if (filtered.length === 0) return NextResponse.json({ error: "No matching problems" }, { status: 404 });
  return NextResponse.json(filtered[Math.floor(Math.random() * filtered.length)]);
}
