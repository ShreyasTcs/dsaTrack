import { getStreaks, putStreaks } from "./storage";
import { StreakData } from "./types";
import { today, addDays } from "./dates";

function streakFromLog(log: Record<string, number>): number {
  let current = 0;
  let cursor = today();
  if (!log[cursor]) cursor = addDays(cursor, -1);
  while (log[cursor]) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return current;
}

export function recordSolve(): void {
  const t = today();
  const streaks = getStreaks();
  const log = { ...streaks.activityLog };
  log[t] = (log[t] || 0) + 1;
  const current = streakFromLog(log);
  putStreaks({
    activityLog: log,
    currentStreak: current,
    longestStreak: Math.max(streaks.longestStreak || 0, current),
  });
}

// Idempotent: recomputes currentStreak from activityLog. Safe to call on every mount.
// If today has no activity, streak counts back from yesterday (today doesn't break it).
export function recomputeStreak(): StreakData {
  const streaks = getStreaks();
  const current = streakFromLog(streaks.activityLog);
  const longest = Math.max(streaks.longestStreak || 0, current);
  if (current === streaks.currentStreak && longest === streaks.longestStreak) {
    return streaks;
  }
  return putStreaks({ currentStreak: current, longestStreak: longest });
}
