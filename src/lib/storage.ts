/**
 * Client-side localStorage storage for user data.
 * Replaces server-side Netlify Blobs / filesystem storage.
 * Static data (problems, topics, sheets, patterns) still comes from API routes.
 */

import { ProblemProgress, StreakData, Contest, Settings } from "./types";
import { getDefaultSM2Fields } from "./sm2";

const KEYS = {
  progress: "dsa-progress",
  streaks: "dsa-streaks",
  contests: "dsa-contests",
  settings: "dsa-settings",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// --- Progress ---
const DEFAULT_PROGRESS: Record<number, ProblemProgress> = {};

export function getProgress(): Record<number, ProblemProgress> {
  return read(KEYS.progress, DEFAULT_PROGRESS);
}

export function getProgressById(id: number): ProblemProgress | null {
  const progress = getProgress();
  return progress[id] ?? null;
}

export function putProgress(id: number, updates: Partial<ProblemProgress>): ProblemProgress {
  const progress = getProgress();
  const existing = progress[id];
  const defaults: ProblemProgress = {
    problemId: id, status: "unsolved", personalDifficulty: 0, notes: "",
    approaches: [], timesTaken: [], bookmarked: false, solveCount: 0, lastSolved: "",
    ...getDefaultSM2Fields(),
  };
  progress[id] = { ...defaults, ...existing, ...updates, problemId: id };
  write(KEYS.progress, progress);
  return progress[id];
}

export function deleteProgress(id: number): void {
  const progress = getProgress();
  delete progress[id];
  write(KEYS.progress, progress);
}

// --- Streaks ---
const DEFAULT_STREAKS: StreakData = { currentStreak: 0, longestStreak: 0, activityLog: {} };

export function getStreaks(): StreakData {
  return read(KEYS.streaks, DEFAULT_STREAKS);
}

export function putStreaks(updates: Partial<StreakData>): StreakData {
  const current = getStreaks();
  const updated = { ...current, ...updates };
  write(KEYS.streaks, updated);
  return updated;
}

// --- Contests ---
export function getContests(): Contest[] {
  return read<Contest[]>(KEYS.contests, []);
}

export function addContest(contest: Omit<Contest, "id">): Contest {
  const contests = getContests();
  const id = crypto.randomUUID();
  const newContest: Contest = { ...contest, id } as Contest;
  contests.unshift(newContest);
  write(KEYS.contests, contests);
  return newContest;
}

export function deleteContest(id: string): void {
  const contests = getContests();
  write(KEYS.contests, contests.filter((c) => c.id !== id));
}

// --- Settings ---
const DEFAULT_SETTINGS: Settings = { theme: "dark-minimal", dailyGoal: 3 };

export function getSettings(): Settings {
  return read(KEYS.settings, DEFAULT_SETTINGS);
}

export function putSettings(updates: Partial<Settings>): Settings {
  const current = getSettings();
  const updated = { ...current, ...updates };
  write(KEYS.settings, updated);
  return updated;
}

// --- Export / Import ---
export function exportAll(): Record<string, unknown> {
  return {
    progress: getProgress(),
    streaks: getStreaks(),
    contests: getContests(),
    settings: getSettings(),
  };
}

export function importAll(data: Record<string, unknown>): void {
  if (data.progress) write(KEYS.progress, data.progress);
  if (data.streaks) write(KEYS.streaks, data.streaks);
  if (data.contests) write(KEYS.contests, data.contests);
  if (data.settings) write(KEYS.settings, data.settings);
}
