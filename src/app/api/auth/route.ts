import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    userSet: !!process.env.DSA_USERNAME,
    passSet: !!process.env.DSA_PASSWORD,
    userLen: (process.env.DSA_USERNAME || "").length,
    passLen: (process.env.DSA_PASSWORD || "").length,
  });
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const validUser = (process.env.DSA_USERNAME || "").trim();
  const validPass = (process.env.DSA_PASSWORD || "").trim();

  if (validUser && validPass && username === validUser && password === validPass) {
    const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");
    return NextResponse.json({ token });
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
