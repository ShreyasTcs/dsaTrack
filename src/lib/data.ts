import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

// --- Storage mode ---
// Netlify: auto-detected via NETLIFY env var, uses built-in Blob storage (free, zero config)
// Local: uses file system (data/*.json)
const isNetlify = !!process.env.NETLIFY;
const DATA_DIR = path.join(process.cwd(), "data");

// --- Netlify Blobs helpers ---
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
  const store = getBlobStore();
  await store.setJSON(key, data);
}

// --- File system helpers (local dev) ---
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

// --- Unified API ---
export async function readJSON<T>(filename: string, fallback: T): Promise<T> {
  if (isNetlify) return blobRead(filename, fallback);
  return fileRead(filename, fallback);
}

export async function writeJSON<T>(filename: string, data: T): Promise<void> {
  if (isNetlify) return blobWrite(filename, data);
  return fileWrite(filename, data);
}

// --- Typed accessors ---
export const readProblems = () => readJSON<import("./types").Problem[]>("problems.json", []);
export const readProgress = () => readJSON<Record<number, import("./types").ProblemProgress>>("progress.json", {});
export const writeProgress = (data: Record<number, import("./types").ProblemProgress>) => writeJSON("progress.json", data);
export const readSheets = () => readJSON<import("./types").Sheet[]>("sheets.json", []);
export const readTopics = () => readJSON<import("./types").Topic[]>("topics.json", []);
export const readPatterns = () => readJSON<import("./types").Pattern[]>("patterns.json", []);
export const readStreaks = () => readJSON<import("./types").StreakData>("streaks.json", { currentStreak: 0, longestStreak: 0, activityLog: {} });
export const writeStreaks = (data: import("./types").StreakData) => writeJSON("streaks.json", data);
export const readContests = () => readJSON<import("./types").Contest[]>("contests.json", []);
export const writeContests = (data: import("./types").Contest[]) => writeJSON("contests.json", data);
export const readSettings = () => readJSON<import("./types").Settings>("settings.json", { theme: "dark-minimal", dailyGoal: 3 });
export const writeSettings = (data: import("./types").Settings) => writeJSON("settings.json", data);
export const readSimilar = () => readJSON<import("./types").SimilarProblems>("similar.json", {});
