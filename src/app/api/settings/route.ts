import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/data";
export async function GET() { return NextResponse.json(await readSettings()); }
export async function PUT(request: Request) {
  const body = await request.json();
  const current = await readSettings();
  const updated = { ...current, ...body };
  await writeSettings(updated);
  return NextResponse.json(updated);
}
