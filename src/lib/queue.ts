import {
  EnrichedProblem,
  ProblemProgress,
  Topic,
  Sheet,
  Settings,
  QueuedProblem,
} from "./types";
import { today as todayStr } from "./dates";

interface QueueInput {
  problems: EnrichedProblem[];
  progress: Record<number, ProblemProgress>;
  topics: Topic[];
  sheets: Sheet[];
  settings: Settings;
}

interface QueueOutput {
  queue: QueuedProblem[];
  adjustedGoal: number;
  reviewDueCount: number;
  ratio: { easy: number; medium: number; hard: number };
}

type Diff = "Easy" | "Medium" | "Hard";

const DIFF_ORDER: Record<Diff, number> = { Easy: 0, Medium: 1, Hard: 2 };

// Approximate 3:2:1 split. For n<6 use a deterministic table; above 6 scale by weight.
export function splitByRatio(n: number): { easy: number; medium: number; hard: number } {
  if (n <= 0) return { easy: 0, medium: 0, hard: 0 };
  const table: Record<number, [number, number, number]> = {
    1: [1, 0, 0],
    2: [1, 1, 0],
    3: [2, 1, 0],
    4: [2, 1, 1],
    5: [3, 1, 1],
    6: [3, 2, 1],
  };
  if (table[n]) {
    const [easy, medium, hard] = table[n];
    return { easy, medium, hard };
  }
  const easy = Math.round((n * 3) / 6);
  const medium = Math.round((n * 2) / 6);
  const hard = n - easy - medium;
  return { easy, medium, hard: Math.max(0, hard) };
}

function diffOf(p: EnrichedProblem): Diff {
  return p.difficulty;
}

// Pull up to `bucket[diff]` items from `pool` into `queue` with the given reason.
// Items already in `usedIds` are skipped. Returns the leftover (unfilled) per bucket.
function fillByBucket(
  pool: EnrichedProblem[],
  bucket: Record<Diff, number>,
  reason: QueuedProblem["reason"],
  queue: QueuedProblem[],
  usedIds: Set<number>
): Record<Diff, number> {
  const remaining: Record<Diff, number> = { Easy: bucket.Easy, Medium: bucket.Medium, Hard: bucket.Hard };
  for (const prob of pool) {
    if (usedIds.has(prob.id)) continue;
    const d = diffOf(prob);
    if (remaining[d] > 0) {
      queue.push({ ...prob, reason });
      usedIds.add(prob.id);
      remaining[d] -= 1;
    }
  }
  // Spillover: if a bucket can't be filled, redistribute the deficit.
  // Hard deficit -> Medium -> Easy. Medium deficit -> Easy -> Hard. Easy deficit -> Medium -> Hard.
  const spillOrder: Record<Diff, Diff[]> = {
    Hard: ["Medium", "Easy"],
    Medium: ["Easy", "Hard"],
    Easy: ["Medium", "Hard"],
  };
  const stillNeeded: Record<Diff, number> = { Easy: 0, Medium: 0, Hard: 0 };
  for (const d of ["Easy", "Medium", "Hard"] as Diff[]) {
    if (remaining[d] > 0) stillNeeded[d] = remaining[d];
  }
  for (const d of ["Easy", "Medium", "Hard"] as Diff[]) {
    if (stillNeeded[d] === 0) continue;
    for (const fallback of spillOrder[d]) {
      while (stillNeeded[d] > 0) {
        const next = pool.find((p) => !usedIds.has(p.id) && diffOf(p) === fallback);
        if (!next) break;
        queue.push({ ...next, reason });
        usedIds.add(next.id);
        stillNeeded[d] -= 1;
      }
      if (stillNeeded[d] === 0) break;
    }
  }
  return stillNeeded;
}

export function generateQueue(input: QueueInput): QueueOutput {
  const { problems, progress, topics, sheets, settings } = input;
  const today = todayStr();
  const dailyGoal = Math.max(1, settings.dailyGoal || 1);
  const reviewCap = settings.reviewCap ?? 20;
  const prep = settings.prepMode?.active ? settings.prepMode : null;

  const queue: QueuedProblem[] = [];
  const usedIds = new Set<number>();

  // Only consider problems that belong to at least one sheet
  const sheetProblemIds = new Set<number>();
  for (const s of sheets) {
    for (const id of s.problemIds) sheetProblemIds.add(id);
  }
  const sheetProblems = problems.filter((p) => sheetProblemIds.has(p.id));

  const isUnsolved = (id: number) => {
    const p = progress[id];
    return !p || p.status === "unsolved";
  };

  // --- Priority 1: Overdue SM-2 reviews (oldest first, capped) ---
  const reviewDueAll = Object.values(progress)
    .filter(
      (p) =>
        (p.status === "solved" || p.status === "review") &&
        !!p.nextReview &&
        p.nextReview <= today &&
        sheetProblemIds.has(p.problemId)
    )
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
  const reviewDue = reviewDueAll.slice(0, reviewCap);
  for (const r of reviewDue) {
    const prob = sheetProblems.find((p) => p.id === r.problemId);
    if (prob) {
      queue.push({ ...prob, reason: "review_due" });
      usedIds.add(prob.id);
    }
  }
  const reviewDueCount = reviewDue.length;

  // --- Adjust goal for Prep Mode ---
  let adjustedGoal = dailyGoal;
  if (prep) {
    const targetSheet = prep.sheet === "all" ? null : sheets.find((s) => s.id === prep.sheet);
    const targetProblemIds = targetSheet ? targetSheet.problemIds : sheetProblems.map((p) => p.id);
    const matching = sheetProblems.filter(
      (p) =>
        targetProblemIds.includes(p.id) &&
        p.companies.includes(prep.company) &&
        isUnsolved(p.id) &&
        !usedIds.has(p.id)
    );
    const remaining = matching.length;
    const deadline = new Date(prep.deadline);
    const now = new Date(today);
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft > 0 && remaining > 0) {
      adjustedGoal = Math.max(dailyGoal, Math.ceil(remaining / daysLeft));
    } else if (daysLeft === 0 && remaining > 0) {
      adjustedGoal = remaining;
    }
  }

  // --- Build target-by-difficulty bucket, then subtract reviews already pulled ---
  const split = splitByRatio(adjustedGoal);
  const bucket: Record<Diff, number> = {
    Easy: split.easy,
    Medium: split.medium,
    Hard: split.hard,
  };
  for (const r of reviewDue) {
    const prob = sheetProblems.find((p) => p.id === r.problemId);
    if (!prob) continue;
    const d = diffOf(prob);
    if (bucket[d] > 0) bucket[d] -= 1;
  }

  // --- Build candidate pool (per-priority), then fill the bucket ---
  if (prep) {
    const targetSheet = prep.sheet === "all" ? null : sheets.find((s) => s.id === prep.sheet);
    const targetProblemIds = targetSheet ? targetSheet.problemIds : sheetProblems.map((p) => p.id);
    const pool = sheetProblems.filter(
      (p) =>
        targetProblemIds.includes(p.id) &&
        p.companies.includes(prep.company) &&
        isUnsolved(p.id) &&
        !usedIds.has(p.id)
    );
    fillByBucket(pool, bucket, "prep_target", queue, usedIds);
  } else {
    // Priority 2: weak topics
    const topicStats = topics.map((t) => {
      const sheetIds = t.problemIds.filter((id) => sheetProblemIds.has(id));
      const solved = sheetIds.filter((id) => progress[id]?.status === "solved").length;
      return { ...t, sheetIds, solved, total: sheetIds.length, pct: sheetIds.length > 0 ? solved / sheetIds.length : 1 };
    });
    const weak = topicStats
      .filter((t) => t.pct < 1 && t.sheetIds.some((id) => isUnsolved(id) && !usedIds.has(id)))
      .sort((a, b) => a.pct - b.pct || b.total - a.total)
      .slice(0, 3);
    const weakIds = new Set<number>();
    for (const t of weak) for (const id of t.sheetIds) weakIds.add(id);
    const weakPool = sheetProblems
      .filter((p) => weakIds.has(p.id) && isUnsolved(p.id) && !usedIds.has(p.id))
      .sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    const stillNeeded = fillByBucket(weakPool, bucket, "weak_topic", queue, usedIds);

    // Priority 3: fill from most-progressed sheet
    const totalLeft = stillNeeded.Easy + stillNeeded.Medium + stillNeeded.Hard;
    if (totalLeft > 0) {
      const sheetStats = sheets.map((s) => {
        const solved = s.problemIds.filter((id) => progress[id]?.status === "solved").length;
        return { ...s, solved, total: s.problemIds.length, pct: s.problemIds.length > 0 ? solved / s.problemIds.length : 0 };
      });
      const bestSheet = sheetStats.filter((s) => s.pct < 1).sort((a, b) => b.pct - a.pct)[0];
      if (bestSheet) {
        const fillPool = bestSheet.problemIds
          .map((id) => sheetProblems.find((p) => p.id === id))
          .filter((p): p is EnrichedProblem => !!p && isUnsolved(p.id) && !usedIds.has(p.id))
          .sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
        fillByBucket(fillPool, stillNeeded, "sheet_fill", queue, usedIds);
      }
    }
  }

  return {
    queue,
    adjustedGoal,
    reviewDueCount,
    ratio: split,
  };
}
