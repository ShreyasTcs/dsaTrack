import {
  EnrichedProblem,
  ProblemProgress,
  Topic,
  Sheet,
  Settings,
  QueuedProblem,
  PrepMode,
} from "./types";

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
}

export function generateQueue(input: QueueInput): QueueOutput {
  const { problems, progress, topics, sheets, settings } = input;
  const today = new Date().toISOString().split("T")[0];
  const dailyGoal = settings.dailyGoal;
  const prep = settings.prepMode?.active ? settings.prepMode : null;

  const queue: QueuedProblem[] = [];
  const usedIds = new Set<number>();

  // Only consider problems that belong to at least one sheet
  const sheetProblemIds = new Set<number>();
  for (const s of sheets) {
    for (const id of s.problemIds) sheetProblemIds.add(id);
  }
  const sheetProblems = problems.filter((p) => sheetProblemIds.has(p.id));

  // Helper: check if problem is unsolved
  const isUnsolved = (id: number) => {
    const p = progress[id];
    return !p || p.status === "unsolved";
  };

  // --- Priority 1: Overdue SM-2 reviews (sheet problems only) ---
  const reviewDue = Object.values(progress).filter(
    (p) => p.status === "solved" && p.nextReview <= today && sheetProblemIds.has(p.problemId)
  );
  for (const r of reviewDue) {
    const prob = sheetProblems.find((p) => p.id === r.problemId);
    if (prob) {
      queue.push({ ...prob, reason: "review_due" });
      usedIds.add(prob.id);
    }
  }

  const reviewDueCount = reviewDue.length;

  // --- Prep Mode adjustments ---
  let adjustedGoal = dailyGoal;
  if (prep) {
    const targetSheet = prep.sheet === "all"
      ? null
      : sheets.find((s) => s.id === prep.sheet);
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

    // --- Priority 2 (Prep): Target company + sheet problems ---
    const sorted = [...matching].sort((a, b) => {
      const order = { Easy: 0, Medium: 1, Hard: 2 };
      return order[a.difficulty] - order[b.difficulty];
    });
    for (const prob of sorted) {
      if (queue.length >= adjustedGoal + reviewDueCount) break;
      if (!usedIds.has(prob.id)) {
        queue.push({ ...prob, reason: "prep_target" });
        usedIds.add(prob.id);
      }
    }
  } else {
    // --- Priority 2 (Default): Weak topics (sheet problems only) ---
    const topicStats = topics.map((t) => {
      const sheetIds = t.problemIds.filter((id) => sheetProblemIds.has(id));
      const solved = sheetIds.filter((id) => progress[id]?.status === "solved").length;
      return { ...t, sheetIds, solved, total: sheetIds.length, pct: sheetIds.length > 0 ? solved / sheetIds.length : 1 };
    });
    const weak = topicStats
      .filter((t) => t.pct < 1 && t.sheetIds.some((id) => isUnsolved(id) && !usedIds.has(id)))
      .sort((a, b) => a.pct - b.pct || b.total - a.total)
      .slice(0, 3);

    for (const topic of weak) {
      if (queue.length >= adjustedGoal + reviewDueCount) break;
      const unsolved = topic.sheetIds.find((id) => isUnsolved(id) && !usedIds.has(id));
      if (unsolved !== undefined) {
        const prob = sheetProblems.find((p) => p.id === unsolved);
        if (prob) {
          queue.push({ ...prob, reason: "weak_topic" });
          usedIds.add(prob.id);
        }
      }
    }

    // --- Priority 3 (Default): Fill from most-progressed sheet ---
    const sheetStats = sheets.map((s) => {
      const solved = s.problemIds.filter((id) => progress[id]?.status === "solved").length;
      return { ...s, solved, total: s.problemIds.length, pct: s.problemIds.length > 0 ? solved / s.problemIds.length : 0 };
    });
    const bestSheet = sheetStats
      .filter((s) => s.pct < 1)
      .sort((a, b) => b.pct - a.pct)[0];

    if (bestSheet) {
      const unsolved = bestSheet.problemIds
        .filter((id) => isUnsolved(id) && !usedIds.has(id))
        .map((id) => sheetProblems.find((p) => p.id === id)!)
        .filter(Boolean)
        .sort((a, b) => {
          const order = { Easy: 0, Medium: 1, Hard: 2 };
          return order[a.difficulty] - order[b.difficulty];
        });

      for (const prob of unsolved) {
        if (queue.length >= adjustedGoal + reviewDueCount) break;
        queue.push({ ...prob, reason: "sheet_fill" });
        usedIds.add(prob.id);
      }
    }
  }

  return { queue, adjustedGoal, reviewDueCount };
}
