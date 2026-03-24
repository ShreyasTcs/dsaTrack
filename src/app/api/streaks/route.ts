import { NextResponse } from "next/server";
import { readStreaks, writeStreaks } from "@/lib/data";
export async function GET() { return NextResponse.json(await readStreaks()); }
export async function PUT(request: Request) {
  const body = await request.json();
  const current = await readStreaks();
  const updated = { ...current, ...body };
  await writeStreaks(updated);
  return NextResponse.json(updated);
}
