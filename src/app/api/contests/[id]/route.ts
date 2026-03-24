import { NextRequest, NextResponse } from "next/server";
import { readContests, writeContests } from "@/lib/data";
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const contests = await readContests();
  const index = contests.findIndex((c) => c.id === id);
  if (index === -1) return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  contests[index] = { ...contests[index], ...body, id };
  await writeContests(contests);
  return NextResponse.json(contests[index]);
}
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contests = await readContests();
  await writeContests(contests.filter((c) => c.id !== id));
  return NextResponse.json({ success: true });
}
