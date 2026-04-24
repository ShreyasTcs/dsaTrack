import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const validUser = process.env.DSA_USERNAME;
  const validPass = process.env.DSA_PASSWORD;

  if (username === validUser && password === validPass) {
    const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");
    return NextResponse.json({ token });
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
