import { NextResponse } from "next/server";
import { readProgress, writeProgress } from "@/lib/data";
export async function GET() { return NextResponse.json(await readProgress()); }
export async function PUT(request: Request) { const body = await request.json(); await writeProgress(body); return NextResponse.json(body); }
