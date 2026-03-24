import { NextResponse } from "next/server";
import { readProgress } from "@/lib/data";
export async function GET() {
  const progress = await readProgress();
  const today = new Date().toISOString().split("T")[0];
  const dueForReview = Object.values(progress).filter((p) => p.status === "solved" && p.nextReview <= today);
  return NextResponse.json(dueForReview);
}
