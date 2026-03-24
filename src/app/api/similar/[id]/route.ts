import { NextRequest, NextResponse } from "next/server";
import { readSimilar, readPatterns, readProblems, readTopics } from "@/lib/data";
import { ExternalProblem } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const problemId = parseInt(id, 10);

  const [similar, patterns, topics, problems] = await Promise.all([
    readSimilar(),
    readPatterns(),
    readTopics(),
    readProblems(),
  ]);

  // Direct match first
  const direct = similar[problemId.toString()] || [];

  // If we have enough direct matches, return them
  if (direct.length >= 3) {
    return NextResponse.json(direct);
  }

  // Otherwise, supplement with pattern-based matches
  const prob = problems.find((p) => p.id === problemId);
  if (!prob) return NextResponse.json(direct);

  const probPatterns = patterns
    .filter((p) => p.problemIds.includes(problemId))
    .map((p) => p.id);
  const probTopics = topics
    .filter((t) => t.problemIds.includes(problemId))
    .map((t) => t.id);

  // Collect pattern-based similar problems
  const patternResults: ExternalProblem[] = [];
  const seenUrls = new Set(direct.map((d) => d.url));

  for (const patId of probPatterns) {
    const patSimilar = similar[`pattern:${patId}`] || [];
    for (const s of patSimilar) {
      if (!seenUrls.has(s.url)) {
        patternResults.push(s);
        seenUrls.add(s.url);
      }
    }
  }

  // Collect topic-based similar problems
  for (const topId of probTopics) {
    const topSimilar = similar[`topic:${topId}`] || [];
    for (const s of topSimilar) {
      if (!seenUrls.has(s.url)) {
        patternResults.push(s);
        seenUrls.add(s.url);
      }
    }
  }

  const combined = [...direct, ...patternResults].slice(0, 10);
  return NextResponse.json(combined);
}
