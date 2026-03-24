import { NextResponse } from "next/server";
import { readContests, writeContests } from "@/lib/data";
import { v4 as uuidv4 } from "uuid";
export async function GET() { return NextResponse.json(await readContests()); }
export async function POST(request: Request) {
  const body = await request.json();
  const contests = await readContests();
  const newContest = { ...body, id: uuidv4() };
  contests.unshift(newContest);
  await writeContests(contests);
  return NextResponse.json(newContest, { status: 201 });
}
