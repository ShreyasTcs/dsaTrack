import { NextRequest, NextResponse } from "next/server";
import { readProgress, writeProgress } from "@/lib/data";
import { ProblemProgress } from "@/lib/types";
import { getDefaultSM2Fields } from "@/lib/sm2";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const progress = await readProgress();
  const entry = progress[parseInt(id, 10)];
  if (!entry) return NextResponse.json({ error: "No progress found" }, { status: 404 });
  return NextResponse.json(entry);
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const problemId = parseInt(id, 10);
  const body: Partial<ProblemProgress> = await request.json();
  const progress = await readProgress();
  const existing = progress[problemId];
  const defaults: ProblemProgress = { problemId, status: "unsolved", personalDifficulty: 0, notes: "", approaches: [], timesTaken: [], bookmarked: false, solveCount: 0, lastSolved: "", ...getDefaultSM2Fields() };
  progress[problemId] = { ...defaults, ...existing, ...body, problemId };
  await writeProgress(progress);
  return NextResponse.json(progress[problemId]);
}
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const progress = await readProgress();
  delete progress[parseInt(id, 10)];
  await writeProgress(progress);
  return NextResponse.json({ success: true });
}
