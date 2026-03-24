import { NextResponse } from "next/server";
import { readTopics, readProgress } from "@/lib/data";
export async function GET() {
  const [topics, progress] = await Promise.all([readTopics(), readProgress()]);
  return NextResponse.json(topics.map((topic) => ({ ...topic, totalProblems: topic.problemIds.length, solved: topic.problemIds.filter((id) => progress[id]?.status === "solved").length })));
}
