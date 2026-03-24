import { NextResponse } from "next/server";
import {
  readProblems,
  readProgress,
  readTopics,
  readSheets,
  readPatterns,
  readSettings,
  readStreaks,
  writeSettings,
} from "@/lib/data";
import { enrichProblems } from "@/lib/enrichProblems";
import { generateQueue } from "@/lib/queue";
import { QueueResponse } from "@/lib/types";

export async function GET() {
  const [problems, progress, topics, sheets, patterns, settings, streaks] =
    await Promise.all([
      readProblems(),
      readProgress(),
      readTopics(),
      readSheets(),
      readPatterns(),
      readSettings(),
      readStreaks(),
    ]);

  const enriched = enrichProblems(problems, topics, sheets, patterns);
  const today = new Date().toISOString().split("T")[0];

  // Auto-deactivate Prep Mode if deadline passed or all done
  if (settings.prepMode?.active) {
    const deadline = new Date(settings.prepMode.deadline);
    const now = new Date(today);
    const daysLeft = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft < 0) {
      settings.prepMode.active = false;
      await writeSettings(settings);
    } else {
      // Check if all target problems are solved
      const targetSheet =
        settings.prepMode.sheet === "all"
          ? null
          : sheets.find((s) => s.id === settings.prepMode!.sheet);
      const targetIds = targetSheet
        ? targetSheet.problemIds
        : problems.map((p) => p.id);
      const matching = targetIds.filter((id) => {
        const prob = problems.find((p) => p.id === id);
        return prob && prob.companies.includes(settings.prepMode!.company);
      });
      const allSolved = matching.every(
        (id) => progress[id]?.status === "solved"
      );
      if (allSolved && matching.length > 0) {
        settings.prepMode.active = false;
        await writeSettings(settings);
      }
    }
  }

  const { queue, adjustedGoal, reviewDueCount } = generateQueue({
    problems: enriched,
    progress,
    topics,
    sheets,
    settings,
  });

  // Build progress subset for queued problems
  const queueProgress: Record<number, (typeof progress)[number]> = {};
  for (const q of queue) {
    if (progress[q.id]) {
      queueProgress[q.id] = progress[q.id];
    }
  }

  const todaySolved = streaks.activityLog[today] || 0;

  // Compute prep stats
  let prepSolved = 0;
  let prepTotal = 0;
  if (settings.prepMode?.active) {
    const targetSheet = settings.prepMode.sheet === "all"
      ? null
      : sheets.find((s) => s.id === settings.prepMode!.sheet);
    const targetIds = targetSheet ? targetSheet.problemIds : problems.map((p) => p.id);
    const matching = enriched.filter(
      (p) => targetIds.includes(p.id) && p.companies.includes(settings.prepMode!.company)
    );
    prepTotal = matching.length;
    prepSolved = matching.filter((p) => progress[p.id]?.status === "solved").length;
  }

  const response: QueueResponse = {
    queue,
    progress: queueProgress,
    stats: {
      todaySolved,
      dailyGoal: settings.dailyGoal,
      adjustedGoal,
      streak: streaks.currentStreak,
      reviewDue: reviewDueCount,
      prepMode: settings.prepMode?.active ? settings.prepMode : null,
      prepSolved,
      prepTotal,
    },
  };

  return NextResponse.json(response);
}
