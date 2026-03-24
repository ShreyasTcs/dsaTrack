import { NextRequest, NextResponse } from "next/server";
import { readProblems, readTopics, readSheets, readPatterns, readProgress } from "@/lib/data";
import { enrichProblems } from "@/lib/enrichProblems";
import { filterProblems } from "@/lib/api-helpers";
export async function GET(request: NextRequest) {
  const [problems, topics, sheets, patterns, progress] = await Promise.all([readProblems(), readTopics(), readSheets(), readPatterns(), readProgress()]);
  const enriched = enrichProblems(problems, topics, sheets, patterns);
  const params = request.nextUrl.searchParams;
  const filtered = filterProblems(enriched, progress, {
    search: params.get("search") || undefined, difficulty: params.get("difficulty") || undefined,
    topic: params.get("topic") || undefined, sheet: params.get("sheet") || undefined,
    pattern: params.get("pattern") || undefined, company: params.get("company") || undefined,
    status: params.get("status") || undefined, bookmarked: params.get("bookmarked") === "true" || undefined,
  });
  return NextResponse.json(filtered);
}
