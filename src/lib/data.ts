import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

// --- Static data imports (always available, bundled at build time) ---
import problemsData from "../../data/problems.json";
import topicsData from "../../data/topics.json";
import sheetsData from "../../data/sheets.json";
import patternsData from "../../data/patterns.json";
import similarData from "../../data/similar.json";

// --- Storage mode ---
const isNetlify = !!process.env.NETLIFY;
const DATA_DIR = path.join(process.cwd(), "data");

// --- Netlify Blobs (for user data: progress, streaks, contests, settings) ---
function getBlobStore() {
  return getStore("dsa-data");
}

async function blobRead<T>(key: string, fallback: T): Promise<T> {
  try {
    const store = getBlobStore();
    const data = await store.get(key, { type: "json" });
    return (data as T) ?? fallback;
  } catch {
    return fallback;
  }
}

async function blobWrite<T>(key: string, data: T): Promise<void> {
  try {
    const store = getBlobStore();
    await store.setJSON(key, data);
  } catch (err) {
    console.error("[blobWrite] Failed to write", key, err);
    throw err;
  }
}

// --- File system (local dev) ---
const fileLocks: Record<string, Promise<void>> = {};

function withLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const key = path.resolve(file);
  const prev = fileLocks[key] || Promise.resolve();
  let release: () => void;
  fileLocks[key] = new Promise<void>((r) => (release = r));
  return prev.then(fn).finally(() => release!());
}

function getPath(filename: string): string {
  return path.join(DATA_DIR, filename);
}

async function fileRead<T>(filename: string, fallback: T): Promise<T> {
  const filePath = getPath(filename);
  try {
    const raw = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function fileWrite<T>(filename: string, data: T): Promise<void> {
  return withLock(filename, async () => {
    const filePath = getPath(filename);
    const tmpPath = filePath + ".tmp";
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    await fs.promises.rename(tmpPath, filePath);
  });
}

// --- Unified read/write for user data ---
export async function readJSON<T>(filename: string, fallback: T): Promise<T> {
  if (isNetlify) return blobRead(filename, fallback);
  return fileRead(filename, fallback);
}

export async function writeJSON<T>(filename: string, data: T): Promise<void> {
  if (isNetlify) return blobWrite(filename, data);
  return fileWrite(filename, data);
}

// --- Static data (read-only, bundled — works everywhere) ---
export const readProblems = async () => problemsData as import("./types").Problem[];
export const readSheets = async () => sheetsData as import("./types").Sheet[];
export const readTopics = async () => topicsData as import("./types").Topic[];
export const readPatterns = async () => patternsData as import("./types").Pattern[];
export const readSimilar = async () => similarData as import("./types").SimilarProblems;

// --- User data (read/write, persisted in blobs or filesystem) ---
export const readProgress = () => readJSON<Record<number, import("./types").ProblemProgress>>("progress.json", {});
export const writeProgress = (data: Record<number, import("./types").ProblemProgress>) => writeJSON("progress.json", data);
export const readStreaks = () => readJSON<import("./types").StreakData>("streaks.json", { currentStreak: 0, longestStreak: 0, activityLog: {} });
export const writeStreaks = (data: import("./types").StreakData) => writeJSON("streaks.json", data);
export const readContests = () => readJSON<import("./types").Contest[]>("contests.json", []);
export const writeContests = (data: import("./types").Contest[]) => writeJSON("contests.json", data);
export const readSettings = () => readJSON<import("./types").Settings>("settings.json", { theme: "dark-minimal", dailyGoal: 3 });
export const writeSettings = (data: import("./types").Settings) => writeJSON("settings.json", data);
