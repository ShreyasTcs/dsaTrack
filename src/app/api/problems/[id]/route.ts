import { NextRequest, NextResponse } from "next/server";
import { readProblems, readTopics, readSheets, readPatterns } from "@/lib/data";
import { enrichProblems } from "@/lib/enrichProblems";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [problems, topics, sheets, patterns] = await Promise.all([readProblems(), readTopics(), readSheets(), readPatterns()]);
  const enriched = enrichProblems(problems, topics, sheets, patterns);
  const problem = enriched.find((p) => p.id === parseInt(id, 10));
  if (!problem) return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  return NextResponse.json(problem);
}
