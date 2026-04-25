import { NextResponse } from "next/server";
import { readProgress } from "@/lib/data";

export async function GET() {
  const progress = await readProgress();
  const today = new Date().toLocaleDateString("en-CA");
  const dueForReview = Object.values(progress).filter(
    (p) =>
      (p.status === "solved" || p.status === "review") &&
      !!p.nextReview &&
      p.nextReview <= today
  );
  return NextResponse.json(dueForReview);
}
