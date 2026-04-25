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

// Approximate 3:2:1 split. For n<=6 use a deterministic table; above 6 scale by weight.
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

interface Candidate {
  prob: EnrichedProblem;
  reason: QueuedProblem["reason"];
}

// Strict pass: take items only if they fit a non-zero bucket slot of their own difficulty.
function fillStrict(
  pool: Candidate[],
  bucket: Record<Diff, number>,
  queue: QueuedProblem[],
  usedIds: Set<number>
): void {
  for (const { prob, reason } of pool) {
    if (usedIds.has(prob.id)) continue;
    const d = prob.difficulty as Diff;
    if (bucket[d] > 0) {
      queue.push({ ...prob, reason });
      usedIds.add(prob.id);
      bucket[d] -= 1;
    }
  }
}

// Spillover pass: top up to the total remaining slots regardless of difficulty.
// Only runs after every priority pool has had a strict shot at the bucket.
function fillSpillover(
  pool: Candidate[],
  bucket: Record<Diff, number>,
  queue: QueuedProblem[],
  usedIds: Set<number>
): void {
  let need = bucket.Easy + bucket.Medium + bucket.Hard;
  if (need <= 0) return;
  for (const { prob, reason } of pool) {
    if (need <= 0) break;
    if (usedIds.has(prob.id)) continue;
    queue.push({ ...prob, reason });
    usedIds.add(prob.id);
    need -= 1;
  }
  bucket.Easy = 0;
  bucket.Medium = 0;
  bucket.Hard = 0;
}

export function generateQueue(input: QueueInput): QueueOutput {
  const { problems, progress, topics, sheets, settings } = input;
  const today = todayStr();
  const dailyGoal = Math.max(1, settings.dailyGoal || 1);
  const reviewCap = settings.reviewCap ?? 20;
  const prep = settings.prepMode?.active ? settings.prepMode : null;

  const queue: QueuedProblem[] = [];
  const usedIds = new Set<number>();

  const sheetProblemIds = new Set<number>();
  for (const s of sheets) for (const id of s.problemIds) sheetProblemIds.add(id);
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

  // --- Adjust goal for Prep Mode deadlines ---
  let adjustedGoal = dailyGoal;
  if (prep) {
    const targetSheet = prep.sheet === "all" ? null : sheets.find((s) => s.id === prep.sheet);
    const targetProblemIds = targetSheet ? targetSheet.problemIds : sheetProblems.map((p) => p.id);
    const remaining = sheetProblems.filter(
      (p) =>
        targetProblemIds.includes(p.id) &&
        p.companies.includes(prep.company) &&
        isUnsolved(p.id) &&
        !usedIds.has(p.id)
    ).length;
    const deadline = new Date(prep.deadline);
    const now = new Date(today);
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0 && remaining > 0) {
      adjustedGoal = Math.max(dailyGoal, Math.ceil(remaining / daysLeft));
    } else if (daysLeft === 0 && remaining > 0) {
      adjustedGoal = remaining;
    }
  }

  // --- Bucket = ratio target minus reviews already pulled in their difficulty ---
  const split = splitByRatio(adjustedGoal);
  const bucket: Record<Diff, number> = { Easy: split.easy, Medium: split.medium, Hard: split.hard };
  for (const r of reviewDue) {
    const prob = sheetProblems.find((p) => p.id === r.problemId);
    if (!prob) continue;
    const d = prob.difficulty as Diff;
    if (bucket[d] > 0) bucket[d] -= 1;
  }

  // --- Build candidate pools ---
  const candidates: Candidate[] = [];

  if (prep) {
    // Prep mode: target company + sheet, sorted Easy -> Hard.
    const targetSheet = prep.sheet === "all" ? null : sheets.find((s) => s.id === prep.sheet);
    const targetProblemIds = targetSheet ? targetSheet.problemIds : sheetProblems.map((p) => p.id);
    const prepPool = sheetProblems
      .filter(
        (p) =>
          targetProblemIds.includes(p.id) &&
          p.companies.includes(prep.company) &&
          isUnsolved(p.id) &&
          !usedIds.has(p.id)
      )
      .sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    for (const p of prepPool) candidates.push({ prob: p, reason: "prep_target" });
  } else {
    // Default mode: walk topics in `order`, then within each topic Easy -> Medium -> Hard.
    // This makes the queue progress topic-by-topic (Arrays first, then Strings, ...).
    const orderedTopics = [...topics].sort((a, b) => a.order - b.order);
    const seen = new Set<number>();
    for (const topic of orderedTopics) {
      const topicProbs = topic.problemIds
        .map((id) => sheetProblems.find((p) => p.id === id))
        .filter((p): p is EnrichedProblem => !!p && isUnsolved(p.id) && !usedIds.has(p.id) && !seen.has(p.id))
        .sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
      for (const p of topicProbs) {
        seen.add(p.id);
        candidates.push({ prob: p, reason: "topic_seq" });
      }
    }
    // Fallback: any sheet problem not in any topic, ordered by sheet completion.
    const sheetStats = sheets
      .map((s) => {
        const solved = s.problemIds.filter((id) => progress[id]?.status === "solved").length;
        return { ...s, pct: s.problemIds.length > 0 ? solved / s.problemIds.length : 0 };
      })
      .filter((s) => s.pct < 1)
      .sort((a, b) => b.pct - a.pct);
    for (const s of sheetStats) {
      for (const id of s.problemIds) {
        if (seen.has(id)) continue;
        const prob = sheetProblems.find((p) => p.id === id);
        if (prob && isUnsolved(prob.id) && !usedIds.has(prob.id)) {
          seen.add(prob.id);
          candidates.push({ prob, reason: "sheet_fill" });
        }
      }
    }
  }

  // Strict pass first: respects the 3:2:1 buckets.
  fillStrict(candidates, bucket, queue, usedIds);
  // Spillover only after the strict pass, so unsatisfied buckets get topped up
  // from any difficulty rather than letting earlier pools run away with the slots.
  fillSpillover(candidates, bucket, queue, usedIds);

  return { queue, adjustedGoal, reviewDueCount, ratio: split };
}
