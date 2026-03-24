# DSA Tracker & Helper — Complete Implementation Guide

> **Instructions for AI Model:** Execute every step in this file top-to-bottom. Create every file exactly as shown. Do NOT use git. Do NOT ask questions — just build it all. The project is already scaffolded with Next.js at the project root. The `src/app/` directory already exists.

## Step 0: Install Dependencies

```bash
npm install recharts uuid
npm install -D @types/uuid
```

## Step 1: Create All Directory Structure

```bash
mkdir -p src/lib src/context src/hooks src/components
mkdir -p src/app/problems/\[id\] src/app/roadmap src/app/analytics src/app/practice src/app/contests
mkdir -p src/app/api/problems/\[id\] src/app/api/progress/\[id\] src/app/api/sheets src/app/api/topics src/app/api/patterns src/app/api/streaks src/app/api/contests/\[id\] src/app/api/settings src/app/api/review src/app/api/random src/app/api/export src/app/api/import
mkdir -p data
```

---

## Step 2: Create `src/lib/types.ts`

```typescript
export interface Problem {
  id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  url: string;
  companies: string[];
}

export interface EnrichedProblem extends Problem {
  topics: string[];
  patterns: string[];
  sheets: string[];
}

export interface Approach {
  name: string;
  description: string;
  timeComplexity: string;
  spaceComplexity: string;
  code?: string;
}

export interface ProblemProgress {
  problemId: number;
  status: "unsolved" | "solved" | "review";
  personalDifficulty: number;
  notes: string;
  approaches: Approach[];
  timesTaken: number[];
  bookmarked: boolean;
  solveCount: number;
  lastSolved: string;
  nextReview: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  prerequisites: string[];
  problemIds: number[];
  order: number;
}

export interface Sheet {
  id: string;
  name: string;
  url?: string;
  problemIds: number[];
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  problemIds: number[];
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  activityLog: Record<string, number>;
}

export interface Contest {
  id: string;
  date: string;
  platform: "LeetCode" | "Codeforces" | "CodeChef" | "Other";
  name: string;
  rank: number;
  problemsSolved: number;
  totalProblems: number;
  rating?: number;
  ratingChange?: number;
}

export interface Settings {
  theme: "dark-minimal" | "colorful" | "professional";
  dailyGoal: number;
}

export interface ProblemFilters {
  topic?: string;
  difficulty?: string;
  sheet?: string;
  pattern?: string;
  company?: string;
  status?: string;
  search?: string;
  bookmarked?: boolean;
}
```

---

## Step 3: Create `src/lib/data.ts`

```typescript
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

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

export async function readJSON<T>(filename: string, fallback: T): Promise<T> {
  const filePath = getPath(filename);
  try {
    const raw = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJSON<T>(filename: string, data: T): Promise<void> {
  return withLock(filename, async () => {
    const filePath = getPath(filename);
    const tmpPath = filePath + ".tmp";
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    await fs.promises.rename(tmpPath, filePath);
  });
}

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
```

---

## Step 4: Create `src/lib/sm2.ts`

```typescript
export interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReview: string;
}

export function calculateSM2(
  quality: number,
  repetitions: number,
  interval: number,
  easeFactor: number
): SM2Result {
  let newInterval: number;
  let newRepetitions: number;
  let newEaseFactor: number;

  if (quality >= 3) {
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else newInterval = Math.round(interval * easeFactor);
    newRepetitions = repetitions + 1;
  } else {
    newInterval = 1;
    newRepetitions = 0;
  }

  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    easeFactor: Number(newEaseFactor.toFixed(2)),
    nextReview: nextReview.toISOString().split("T")[0],
  };
}

export function getDefaultSM2Fields() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    nextReview: tomorrow.toISOString().split("T")[0],
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
  };
}
```

---

## Step 5: Create `src/lib/enrichProblems.ts`

```typescript
import { Problem, EnrichedProblem, Topic, Sheet, Pattern } from "./types";

export function enrichProblems(
  problems: Problem[],
  topics: Topic[],
  sheets: Sheet[],
  patterns: Pattern[]
): EnrichedProblem[] {
  const topicMap = new Map<number, string[]>();
  for (const t of topics) {
    for (const pid of t.problemIds) {
      if (!topicMap.has(pid)) topicMap.set(pid, []);
      topicMap.get(pid)!.push(t.name);
    }
  }

  const sheetMap = new Map<number, string[]>();
  for (const s of sheets) {
    for (const pid of s.problemIds) {
      if (!sheetMap.has(pid)) sheetMap.set(pid, []);
      sheetMap.get(pid)!.push(s.name);
    }
  }

  const patternMap = new Map<number, string[]>();
  for (const p of patterns) {
    for (const pid of p.problemIds) {
      if (!patternMap.has(pid)) patternMap.set(pid, []);
      patternMap.get(pid)!.push(p.name);
    }
  }

  return problems.map((prob) => ({
    ...prob,
    topics: topicMap.get(prob.id) || [],
    sheets: sheetMap.get(prob.id) || [],
    patterns: patternMap.get(prob.id) || [],
  }));
}
```

---

## Step 6: Create `src/lib/api-helpers.ts`

```typescript
import { EnrichedProblem, ProblemFilters, ProblemProgress } from "./types";

export function filterProblems(
  problems: EnrichedProblem[],
  progress: Record<number, ProblemProgress>,
  filters: ProblemFilters
): EnrichedProblem[] {
  let result = problems;

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((p) => p.title.toLowerCase().includes(q));
  }
  if (filters.difficulty) result = result.filter((p) => p.difficulty === filters.difficulty);
  if (filters.topic) result = result.filter((p) => p.topics.includes(filters.topic!));
  if (filters.sheet) result = result.filter((p) => p.sheets.includes(filters.sheet!));
  if (filters.pattern) result = result.filter((p) => p.patterns.includes(filters.pattern!));
  if (filters.company) result = result.filter((p) => p.companies.includes(filters.company!));
  if (filters.status) {
    result = result.filter((p) => {
      const prog = progress[p.id];
      if (filters.status === "unsolved") return !prog || prog.status === "unsolved";
      if (filters.status === "solved") return prog?.status === "solved";
      if (filters.status === "review") return prog?.status === "review";
      return true;
    });
  }
  if (filters.bookmarked === true) result = result.filter((p) => progress[p.id]?.bookmarked);

  return result;
}
```

---

## Step 7: Create `src/context/ThemeContext.tsx`

```typescript
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark-minimal" | "colorful" | "professional";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark-minimal",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark-minimal");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setTheme(s.theme || "dark-minimal"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

---

## Step 8: Create `src/hooks/useTimer.ts`

```typescript
"use client";

import { useState, useRef, useCallback } from "react";

export function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, [running]);

  const pause = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return { elapsed, running, start, pause, reset, display: formatTime(elapsed), minutes: Math.round(elapsed / 60) };
}
```

---

## Step 9: Replace `src/app/globals.css`

Delete the existing file and create this one:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
body { background: var(--bg-primary); color: var(--text-primary); min-height: 100vh; transition: background 0.3s, color 0.3s; }
a { color: var(--accent-primary); text-decoration: none; }
a:hover { text-decoration: underline; }

[data-theme="dark-minimal"] {
  --bg-primary: #1a1b26; --bg-secondary: #24283b; --bg-card: #1f2335; --bg-hover: #292e42;
  --border: #3b4261; --text-primary: #c0caf5; --text-secondary: #a9b1d6; --text-muted: #565f89;
  --accent-primary: #7aa2f7; --accent-secondary: #bb9af7; --success: #9ece6a; --warning: #e0af68; --danger: #f7768e;
  --easy: #9ece6a; --medium: #e0af68; --hard: #f7768e;
  --chart-1: #7aa2f7; --chart-2: #9ece6a; --chart-3: #e0af68; --chart-4: #bb9af7; --chart-5: #f7768e;
  --shadow: 0 2px 8px rgba(0,0,0,0.3);
}

[data-theme="colorful"] {
  --bg-primary: #0f0f23; --bg-secondary: #1a1a3e; --bg-card: #16163a; --bg-hover: #222255;
  --border: #3333aa; --text-primary: #e8e8ff; --text-secondary: #b8b8e8; --text-muted: #7777bb;
  --accent-primary: #00d4ff; --accent-secondary: #ff6bcb; --success: #00ff88; --warning: #ffcc00; --danger: #ff4466;
  --easy: #00ff88; --medium: #ffcc00; --hard: #ff4466;
  --chart-1: #00d4ff; --chart-2: #00ff88; --chart-3: #ffcc00; --chart-4: #ff6bcb; --chart-5: #ff4466;
  --shadow: 0 2px 12px rgba(0,100,255,0.15);
}

[data-theme="professional"] {
  --bg-primary: #ffffff; --bg-secondary: #f8f9fa; --bg-card: #ffffff; --bg-hover: #f0f0f0;
  --border: #dee2e6; --text-primary: #212529; --text-secondary: #495057; --text-muted: #868e96;
  --accent-primary: #4263eb; --accent-secondary: #7c3aed; --success: #2b8a3e; --warning: #e67700; --danger: #c92a2a;
  --easy: #2b8a3e; --medium: #e67700; --hard: #c92a2a;
  --chart-1: #4263eb; --chart-2: #2b8a3e; --chart-3: #e67700; --chart-4: #7c3aed; --chart-5: #c92a2a;
  --shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.container { max-width: 1280px; margin: 0 auto; padding: 24px; }
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; box-shadow: var(--shadow); }
.chip { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.chip-easy { background: color-mix(in srgb, var(--easy) 15%, transparent); color: var(--easy); }
.chip-medium { background: color-mix(in srgb, var(--medium) 15%, transparent); color: var(--medium); }
.chip-hard { background: color-mix(in srgb, var(--hard) 15%, transparent); color: var(--hard); }
.chip-topic { background: color-mix(in srgb, var(--accent-primary) 15%, transparent); color: var(--accent-primary); }
.chip-pattern { background: color-mix(in srgb, var(--accent-secondary) 15%, transparent); color: var(--accent-secondary); }
.chip-sheet { background: color-mix(in srgb, var(--warning) 15%, transparent); color: var(--warning); }

button, .btn {
  padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg-secondary); color: var(--text-primary); cursor: pointer;
  font-size: 14px; transition: background 0.2s;
}
button:hover, .btn:hover { background: var(--bg-hover); }
.btn-primary { background: var(--accent-primary); color: white; border: none; }
.btn-primary:hover { opacity: 0.9; }

input, select, textarea {
  padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg-secondary); color: var(--text-primary); font-size: 14px;
  outline: none; transition: border-color 0.2s;
}
input:focus, select:focus, textarea:focus { border-color: var(--accent-primary); }

table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 12px; color: var(--text-muted); border-bottom: 1px solid var(--border); font-weight: 600; font-size: 13px; }
td { padding: 12px; border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent); font-size: 14px; }
tr:hover { background: var(--bg-hover); }
```

---

## Step 10: Create All Components

### `src/components/Navbar.module.css`
```css
.navbar { background: var(--bg-secondary); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
.container { max-width: 1280px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; height: 56px; gap: 32px; }
.logo { font-size: 18px; font-weight: 700; color: var(--accent-primary); text-decoration: none; }
.links { display: flex; gap: 4px; flex: 1; }
.link { padding: 6px 14px; border-radius: 6px; font-size: 14px; color: var(--text-secondary); text-decoration: none; transition: background 0.2s, color 0.2s; }
.link:hover { background: var(--bg-hover); color: var(--text-primary); text-decoration: none; }
.active { background: var(--bg-hover); color: var(--accent-primary); font-weight: 500; }
```

### `src/components/Navbar.tsx`
```typescript
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeSwitcher from "./ThemeSwitcher";
import styles from "./Navbar.module.css";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/problems", label: "Problems" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/analytics", label: "Analytics" },
  { href: "/practice", label: "Practice" },
  { href: "/contests", label: "Contests" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>DSA Tracker</Link>
        <div className={styles.links}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`${styles.link} ${pathname === link.href ? styles.active : ""}`}>{link.label}</Link>
          ))}
        </div>
        <ThemeSwitcher />
      </div>
    </nav>
  );
}
```

### `src/components/ThemeSwitcher.module.css`
```css
.switcher { display: flex; gap: 4px; }
.btn { width: 32px; height: 32px; border-radius: 6px; border: 1px solid var(--border); background: transparent; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
.btn:hover { background: var(--bg-hover); }
.active { background: var(--bg-hover); border-color: var(--accent-primary); }
```

### `src/components/ThemeSwitcher.tsx`
```typescript
"use client";
import { useTheme } from "@/context/ThemeContext";
import styles from "./ThemeSwitcher.module.css";

const themes = [
  { value: "dark-minimal" as const, icon: "\u{1F319}", label: "Dark" },
  { value: "colorful" as const, icon: "\u{1F3A8}", label: "Colorful" },
  { value: "professional" as const, icon: "\u2600\uFE0F", label: "Light" },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <div className={styles.switcher}>
      {themes.map((t) => (
        <button key={t.value} className={`${styles.btn} ${theme === t.value ? styles.active : ""}`} onClick={() => setTheme(t.value)} title={t.label}>{t.icon}</button>
      ))}
    </div>
  );
}
```

### `src/components/StatCard.module.css`
```css
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; box-shadow: var(--shadow); }
.value { font-size: 28px; font-weight: 700; color: var(--accent-primary); }
.label { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
```

### `src/components/StatCard.tsx`
```typescript
import styles from "./StatCard.module.css";
interface Props { label: string; value: string | number; color?: string; }
export default function StatCard({ label, value, color }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.value} style={color ? { color } : undefined}>{value}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
```

### `src/components/ProgressBar.module.css`
```css
.bar { margin-bottom: 12px; }
.header { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
.pct { color: var(--text-muted); }
.track { background: var(--bg-secondary); border-radius: 4px; height: 6px; overflow: hidden; }
.fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
```

### `src/components/ProgressBar.tsx`
```typescript
import styles from "./ProgressBar.module.css";
interface Props { label: string; value: number; max: number; color?: string; }
export default function ProgressBar({ label, value, max, color }: Props) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={styles.bar}>
      <div className={styles.header}><span>{label}</span><span className={styles.pct}>{pct}%</span></div>
      <div className={styles.track}><div className={styles.fill} style={{ width: `${pct}%`, background: color || "var(--accent-primary)" }} /></div>
    </div>
  );
}
```

### `src/components/Heatmap.module.css`
```css
.heatmap { overflow-x: auto; }
.grid { display: flex; flex-wrap: wrap; gap: 3px; max-width: 100%; }
.cell { width: 14px; height: 14px; border-radius: 2px; }
.level0 { background: var(--bg-secondary); }
.level1 { background: color-mix(in srgb, var(--success) 30%, var(--bg-secondary)); }
.level2 { background: color-mix(in srgb, var(--success) 55%, var(--bg-secondary)); }
.level3 { background: color-mix(in srgb, var(--success) 80%, var(--bg-secondary)); }
.level4 { background: var(--success); }
```

### `src/components/Heatmap.tsx`
```typescript
"use client";
import styles from "./Heatmap.module.css";
interface Props { activityLog: Record<string, number>; }
export default function Heatmap({ activityLog }: Props) {
  const today = new Date();
  const days: { date: string; count: number }[] = [];
  for (let i = 182; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-CA");
    days.push({ date: dateStr, count: activityLog[dateStr] || 0 });
  }
  const getLevel = (count: number) => {
    if (count === 0) return styles.level0;
    if (count <= 1) return styles.level1;
    if (count <= 3) return styles.level2;
    if (count <= 5) return styles.level3;
    return styles.level4;
  };
  return (
    <div className={styles.heatmap}>
      <div className={styles.grid}>
        {days.map((day) => (<div key={day.date} className={`${styles.cell} ${getLevel(day.count)}`} title={`${day.date}: ${day.count} problems`} />))}
      </div>
    </div>
  );
}
```

### `src/components/Timer.module.css`
```css
.timer { text-align: center; }
.display { font-size: 36px; font-weight: 700; color: var(--accent-primary); font-family: monospace; margin-bottom: 12px; }
.controls { display: flex; gap: 8px; justify-content: center; }
```

### `src/components/Timer.tsx`
```typescript
"use client";
import { useTimer } from "@/hooks/useTimer";
import styles from "./Timer.module.css";
interface Props { onComplete?: (minutes: number) => void; }
export default function Timer({ onComplete }: Props) {
  const { display, running, start, pause, reset, minutes } = useTimer();
  return (
    <div className={styles.timer}>
      <div className={styles.display}>{display}</div>
      <div className={styles.controls}>
        {!running ? (<button onClick={start} className="btn-primary">Start</button>) : (<button onClick={pause}>Pause</button>)}
        <button onClick={() => { reset(); onComplete?.(minutes); }}>Done</button>
      </div>
    </div>
  );
}
```

### `src/components/FilterBar.module.css`
```css
.bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.search { flex: 1; min-width: 200px; }
.select { min-width: 140px; }
```

### `src/components/FilterBar.tsx`
```typescript
"use client";
import styles from "./FilterBar.module.css";
interface FilterOption { label: string; value: string; }
interface FilterConfig { name: string; placeholder: string; options: FilterOption[]; }
interface Props { filters: FilterConfig[]; values: Record<string, string>; onFilter: (name: string, value: string) => void; searchValue?: string; onSearch?: (value: string) => void; }
export default function FilterBar({ filters, values, onFilter, searchValue, onSearch }: Props) {
  return (
    <div className={styles.bar}>
      {onSearch && (<input className={styles.search} type="text" placeholder="Search problems..." value={searchValue || ""} onChange={(e) => onSearch(e.target.value)} />)}
      {filters.map((f) => (
        <select key={f.name} value={values[f.name] || ""} onChange={(e) => onFilter(f.name, e.target.value)} className={styles.select}>
          <option value="">{f.placeholder}</option>
          {f.options.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
        </select>
      ))}
    </div>
  );
}
```

### `src/components/ProblemCard.module.css`
```css
.card { display: block; padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); text-decoration: none; color: var(--text-primary); transition: background 0.2s; margin-bottom: 8px; }
.card:hover { background: var(--bg-hover); text-decoration: none; }
.header { display: flex; align-items: center; gap: 8px; }
.status { font-size: 14px; }
.title { flex: 1; font-size: 14px; font-weight: 500; }
.topics { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
```

### `src/components/ProblemCard.tsx`
```typescript
import Link from "next/link";
import styles from "./ProblemCard.module.css";
interface Props { id: number; title: string; difficulty: "Easy" | "Medium" | "Hard"; topics?: string[]; status?: string; }
export default function ProblemCard({ id, title, difficulty, topics, status }: Props) {
  return (
    <Link href={`/problems/${id}`} className={styles.card}>
      <div className={styles.header}>
        <span className={styles.status}>{status === "solved" ? "\u2705" : status === "review" ? "\u{1F504}" : "\u2B55"}</span>
        <span className={styles.title}>{title}</span>
        <span className={`chip chip-${difficulty.toLowerCase()}`}>{difficulty}</span>
      </div>
      {topics && topics.length > 0 && (<div className={styles.topics}>{topics.slice(0, 3).map((t) => (<span key={t} className="chip chip-topic">{t}</span>))}</div>)}
    </Link>
  );
}
```

### `src/components/TopicGraph.module.css`
```css
.graph { display: flex; flex-direction: column; gap: 24px; align-items: center; padding: 20px; }
.tier { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
.node { border-radius: 12px; padding: 16px 24px; cursor: pointer; text-align: center; min-width: 160px; border: 2px solid var(--border); background: var(--bg-card); transition: transform 0.2s, border-color 0.2s; }
.node:hover { transform: translateY(-2px); }
.name { font-weight: 600; font-size: 14px; }
.stats { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.statusLabel { font-size: 11px; margin-top: 6px; }
.complete { border-color: var(--success); }
.complete .statusLabel { color: var(--success); }
.inProgress { border-color: var(--accent-primary); }
.inProgress .statusLabel { color: var(--accent-primary); }
.available { border-color: var(--warning); }
.available .statusLabel { color: var(--warning); }
.locked { opacity: 0.5; cursor: default; }
.locked .statusLabel { color: var(--text-muted); }
```

### `src/components/TopicGraph.tsx`
```typescript
"use client";
import styles from "./TopicGraph.module.css";
interface TopicNode { id: string; name: string; prerequisites: string[]; totalProblems: number; solved: number; }
interface Props { topics: TopicNode[]; onTopicClick: (id: string) => void; }
export default function TopicGraph({ topics, onTopicClick }: Props) {
  const getStatus = (t: TopicNode) => {
    if (t.solved === t.totalProblems && t.totalProblems > 0) return "complete";
    if (t.solved > 0) return "inProgress";
    const prereqsMet = t.prerequisites.every((preId) => {
      const pre = topics.find((tp) => tp.id === preId);
      return pre && pre.solved === pre.totalProblems && pre.totalProblems > 0;
    });
    return prereqsMet || t.prerequisites.length === 0 ? "available" : "locked";
  };
  const getTier = (topicId: string, visited = new Set<string>()): number => {
    if (visited.has(topicId)) return 0;
    visited.add(topicId);
    const topic = topics.find((t) => t.id === topicId);
    if (!topic || topic.prerequisites.length === 0) return 0;
    return 1 + Math.max(...topic.prerequisites.map((p) => getTier(p, visited)));
  };
  const tiers: Map<number, TopicNode[]> = new Map();
  for (const t of topics) {
    const tier = getTier(t.id);
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(t);
  }
  const sortedTiers = [...tiers.entries()].sort((a, b) => a[0] - b[0]);
  return (
    <div className={styles.graph}>
      {sortedTiers.map(([tier, tierTopics]) => (
        <div key={tier} className={styles.tier}>
          {tierTopics.map((t) => {
            const status = getStatus(t);
            return (
              <button key={t.id} className={`${styles.node} ${styles[status]}`} onClick={() => onTopicClick(t.id)}>
                <div className={styles.name}>{t.name}</div>
                <div className={styles.stats}>{t.solved}/{t.totalProblems}</div>
                <div className={styles.statusLabel}>
                  {status === "complete" ? "\u2705 Complete" : status === "inProgress" ? "\u{1F504} In Progress" : status === "available" ? "\u25B6 Available" : "\u{1F512} Locked"}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

---

## Step 11: Create All API Routes

### `src/app/api/settings/route.ts`
```typescript
import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/data";
export async function GET() { return NextResponse.json(await readSettings()); }
export async function PUT(request: Request) {
  const body = await request.json();
  const current = await readSettings();
  const updated = { ...current, ...body };
  await writeSettings(updated);
  return NextResponse.json(updated);
}
```

### `src/app/api/problems/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { readProblems, readTopics, readSheets, readPatterns, readProgress } from "@/lib/data";
import { enrichProblems } from "@/lib/enrichProblems";
import { filterProblems } from "@/lib/api-helpers";
export async function GET(request: NextRequest) {
  const [problems, topics, sheets, patterns, progress] = await Promise.all([readProblems(), readTopics(), readSheets(), readPatterns(), readProgress()]);
  const enriched = enrichProblems(problems, topics, sheets, patterns);
  const params = request.nextUrl.searchParams;
  const filtered = filterProblems(enriched, progress, {
    search: params.get("search") || undefined, difficulty: params.get("difficulty") || undefined,
    topic: params.get("topic") || undefined, sheet: params.get("sheet") || undefined,
    pattern: params.get("pattern") || undefined, company: params.get("company") || undefined,
    status: params.get("status") || undefined, bookmarked: params.get("bookmarked") === "true" || undefined,
  });
  return NextResponse.json(filtered);
}
```

### `src/app/api/problems/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { readProblems, readTopics, readSheets, readPatterns } from "@/lib/data";
import { enrichProblems } from "@/lib/enrichProblems";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [problems, topics, sheets, patterns] = await Promise.all([readProblems(), readTopics(), readSheets(), readPatterns()]);
  const enriched = enrichProblems(problems, topics, sheets, patterns);
  const problem = enriched.find((p) => p.id === parseInt(id, 10));
  if (!problem) return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  return NextResponse.json(problem);
}
```

### `src/app/api/progress/route.ts`
```typescript
import { NextResponse } from "next/server";
import { readProgress, writeProgress } from "@/lib/data";
export async function GET() { return NextResponse.json(await readProgress()); }
export async function PUT(request: Request) { const body = await request.json(); await writeProgress(body); return NextResponse.json(body); }
```

### `src/app/api/progress/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { readProgress, writeProgress } from "@/lib/data";
import { ProblemProgress } from "@/lib/types";
import { getDefaultSM2Fields } from "@/lib/sm2";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const progress = await readProgress();
  const entry = progress[parseInt(id, 10)];
  if (!entry) return NextResponse.json({ error: "No progress found" }, { status: 404 });
  return NextResponse.json(entry);
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const problemId = parseInt(id, 10);
  const body: Partial<ProblemProgress> = await request.json();
  const progress = await readProgress();
  const existing = progress[problemId];
  const defaults: ProblemProgress = { problemId, status: "unsolved", personalDifficulty: 0, notes: "", approaches: [], timesTaken: [], bookmarked: false, solveCount: 0, lastSolved: "", ...getDefaultSM2Fields() };
  progress[problemId] = { ...defaults, ...existing, ...body, problemId };
  await writeProgress(progress);
  return NextResponse.json(progress[problemId]);
}
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const progress = await readProgress();
  delete progress[parseInt(id, 10)];
  await writeProgress(progress);
  return NextResponse.json({ success: true });
}
```

### `src/app/api/review/route.ts`
```typescript
import { NextResponse } from "next/server";
import { readProgress } from "@/lib/data";
export async function GET() {
  const progress = await readProgress();
  const today = new Date().toISOString().split("T")[0];
  const dueForReview = Object.values(progress).filter((p) => p.status === "solved" && p.nextReview <= today);
  return NextResponse.json(dueForReview);
}
```

### `src/app/api/streaks/route.ts`
```typescript
import { NextResponse } from "next/server";
import { readStreaks, writeStreaks } from "@/lib/data";
export async function GET() { return NextResponse.json(await readStreaks()); }
export async function PUT(request: Request) {
  const body = await request.json();
  const current = await readStreaks();
  const updated = { ...current, ...body };
  await writeStreaks(updated);
  return NextResponse.json(updated);
}
```

### `src/app/api/random/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { readProblems, readTopics, readSheets, readPatterns, readProgress } from "@/lib/data";
import { enrichProblems } from "@/lib/enrichProblems";
import { filterProblems } from "@/lib/api-helpers";
export async function GET(request: NextRequest) {
  const [problems, topics, sheets, patterns, progress] = await Promise.all([readProblems(), readTopics(), readSheets(), readPatterns(), readProgress()]);
  const enriched = enrichProblems(problems, topics, sheets, patterns);
  const params = request.nextUrl.searchParams;
  const filtered = filterProblems(enriched, progress, { topic: params.get("topic") || undefined, difficulty: params.get("difficulty") || undefined, pattern: params.get("pattern") || undefined, status: params.get("status") || undefined });
  if (filtered.length === 0) return NextResponse.json({ error: "No matching problems" }, { status: 404 });
  return NextResponse.json(filtered[Math.floor(Math.random() * filtered.length)]);
}
```

### `src/app/api/sheets/route.ts`
```typescript
import { NextResponse } from "next/server";
import { readSheets, readProgress } from "@/lib/data";
export async function GET() {
  const [sheets, progress] = await Promise.all([readSheets(), readProgress()]);
  return NextResponse.json(sheets.map((sheet) => ({ ...sheet, totalProblems: sheet.problemIds.length, solved: sheet.problemIds.filter((id) => progress[id]?.status === "solved").length })));
}
```

### `src/app/api/topics/route.ts`
```typescript
import { NextResponse } from "next/server";
import { readTopics, readProgress } from "@/lib/data";
export async function GET() {
  const [topics, progress] = await Promise.all([readTopics(), readProgress()]);
  return NextResponse.json(topics.map((topic) => ({ ...topic, totalProblems: topic.problemIds.length, solved: topic.problemIds.filter((id) => progress[id]?.status === "solved").length })));
}
```

### `src/app/api/patterns/route.ts`
```typescript
import { NextResponse } from "next/server";
import { readPatterns, readProgress } from "@/lib/data";
export async function GET() {
  const [patterns, progress] = await Promise.all([readPatterns(), readProgress()]);
  return NextResponse.json(patterns.map((pattern) => ({ ...pattern, totalProblems: pattern.problemIds.length, solved: pattern.problemIds.filter((id) => progress[id]?.status === "solved").length })));
}
```

### `src/app/api/contests/route.ts`
```typescript
import { NextResponse } from "next/server";
import { readContests, writeContests } from "@/lib/data";
import { v4 as uuidv4 } from "uuid";
export async function GET() { return NextResponse.json(await readContests()); }
export async function POST(request: Request) {
  const body = await request.json();
  const contests = await readContests();
  const newContest = { ...body, id: uuidv4() };
  contests.unshift(newContest);
  await writeContests(contests);
  return NextResponse.json(newContest, { status: 201 });
}
```

### `src/app/api/contests/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { readContests, writeContests } from "@/lib/data";
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const contests = await readContests();
  const index = contests.findIndex((c) => c.id === id);
  if (index === -1) return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  contests[index] = { ...contests[index], ...body, id };
  await writeContests(contests);
  return NextResponse.json(contests[index]);
}
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contests = await readContests();
  await writeContests(contests.filter((c) => c.id !== id));
  return NextResponse.json({ success: true });
}
```

### `src/app/api/export/route.ts`
```typescript
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILES = ["problems.json","progress.json","sheets.json","topics.json","patterns.json","streaks.json","contests.json","settings.json"];
export async function GET() {
  const backup: Record<string, unknown> = {};
  for (const file of DATA_FILES) { try { backup[file] = JSON.parse(await fs.promises.readFile(path.join(DATA_DIR, file), "utf-8")); } catch { backup[file] = null; } }
  return new NextResponse(JSON.stringify(backup, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="dsa-tracker-backup-${new Date().toISOString().split("T")[0]}.json"` } });
}
```

### `src/app/api/import/route.ts`
```typescript
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
const DATA_DIR = path.join(process.cwd(), "data");
const ALLOWED_FILES = new Set(["problems.json","progress.json","sheets.json","topics.json","patterns.json","streaks.json","contests.json","settings.json"]);
export async function POST(request: Request) {
  const backup = await request.json();
  for (const [filename, data] of Object.entries(backup)) {
    if (data !== null && ALLOWED_FILES.has(filename)) {
      const filePath = path.join(DATA_DIR, filename);
      await fs.promises.writeFile(filePath + ".tmp", JSON.stringify(data, null, 2), "utf-8");
      await fs.promises.rename(filePath + ".tmp", filePath);
    }
  }
  return NextResponse.json({ success: true });
}
```

---

## Step 12: Create All Pages

Due to length, each page file is described below. Create each file exactly as shown.

### Replace `src/app/layout.tsx`
```typescript
import type { Metadata } from "next";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";
import "./globals.css";
export const metadata: Metadata = { title: "DSA Tracker & Helper", description: "Personal DSA development tracker" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark-minimal">
      <body><ThemeProvider><Navbar /><main className="container">{children}</main></ThemeProvider></body>
    </html>
  );
}
```

### Replace `src/app/page.tsx` (Dashboard)
```typescript
"use client";
import { useEffect, useState } from "react";
import StatCard from "@/components/StatCard";
import ProgressBar from "@/components/ProgressBar";
import Heatmap from "@/components/Heatmap";
import ProblemCard from "@/components/ProblemCard";
import { ProblemProgress, EnrichedProblem, Settings } from "@/lib/types";

interface TopicWithStats { id: string; name: string; totalProblems: number; solved: number; }

export default function Dashboard() {
  const [progress, setProgress] = useState<Record<number, ProblemProgress>>({});
  const [topics, setTopics] = useState<TopicWithStats[]>([]);
  const [reviewDue, setReviewDue] = useState<ProblemProgress[]>([]);
  const [streaks, setStreaks] = useState({ currentStreak: 0, longestStreak: 0, activityLog: {} as Record<string, number> });
  const [settings, setSettings] = useState<Settings>({ theme: "dark-minimal", dailyGoal: 3 });
  const [problems, setProblems] = useState<EnrichedProblem[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/progress").then((r) => r.json()),
      fetch("/api/topics").then((r) => r.json()),
      fetch("/api/review").then((r) => r.json()),
      fetch("/api/streaks").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/problems").then((r) => r.json()),
    ]).then(([prog, top, rev, str, set, prob]) => {
      setProgress(prog); setTopics(top); setReviewDue(rev); setStreaks(str); setSettings(set); setProblems(prob);
    });
  }, []);

  const totalSolved = Object.values(progress).filter((p) => p.status === "solved").length;
  const totalProblems = problems.length;
  const overallPct = totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0;
  const today = new Date().toLocaleDateString("en-CA");
  const todaySolved = streaks.activityLog[today] || 0;

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Problems Solved" value={totalSolved} color="var(--accent-primary)" />
        <StatCard label="Day Streak" value={streaks.currentStreak} color="var(--success)" />
        <StatCard label="Overall Progress" value={`${overallPct}%`} color="var(--warning)" />
        <StatCard label="Due for Review" value={reviewDue.length} color="var(--accent-secondary)" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <div>
          <div className="card" style={{ marginBottom: 20 }}><h3 style={{ marginBottom: 12 }}>Activity</h3><Heatmap activityLog={streaks.activityLog} /></div>
          <div className="card"><h3 style={{ marginBottom: 12 }}>Topic Progress</h3>
            {topics.map((t) => (<ProgressBar key={t.id} label={t.name} value={t.solved} max={t.totalProblems} color={t.solved === t.totalProblems ? "var(--success)" : "var(--accent-primary)"} />))}
          </div>
        </div>
        <div>
          <div className="card" style={{ marginBottom: 20 }}><h3 style={{ marginBottom: 12 }}>Due for Review</h3>
            {reviewDue.length === 0 ? (<p style={{ color: "var(--text-muted)", fontSize: 14 }}>No problems due for review!</p>) :
              reviewDue.slice(0, 5).map((r) => { const prob = problems.find((p) => p.id === r.problemId); return prob ? (<ProblemCard key={r.problemId} id={prob.id} title={prob.title} difficulty={prob.difficulty} status="review" />) : null; })}
          </div>
          <div className="card"><h3 style={{ marginBottom: 12 }}>Today&apos;s Goal</h3>
            <div style={{ textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: todaySolved >= settings.dailyGoal ? "var(--success)" : "var(--accent-primary)" }}>{todaySolved} / {settings.dailyGoal}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>problems today</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Create `src/app/problems/page.tsx` (Problems List)
```typescript
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import { EnrichedProblem, ProblemProgress } from "@/lib/types";

export default function ProblemsPage() {
  const [problems, setProblems] = useState<EnrichedProblem[]>([]);
  const [progress, setProgress] = useState<Record<number, ProblemProgress>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<string>("id");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/problems").then((r) => r.json()),
      fetch("/api/progress").then((r) => r.json()),
      fetch("/api/topics").then((r) => r.json()),
      fetch("/api/sheets").then((r) => r.json()),
      fetch("/api/patterns").then((r) => r.json()),
    ]).then(([prob, prog, top, sh, pat]) => {
      setProblems(prob); setProgress(prog);
      setTopics(top.map((t: { name: string }) => t.name));
      setSheets(sh.map((s: { name: string }) => s.name));
      setPatterns(pat.map((p: { name: string }) => p.name));
      const allCompanies = new Set<string>();
      prob.forEach((p: EnrichedProblem) => p.companies?.forEach((c: string) => allCompanies.add(c)));
      setCompanies([...allCompanies].sort());
    });
  }, []);

  const filtered = problems.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.difficulty && p.difficulty !== filters.difficulty) return false;
    if (filters.topic && !p.topics.includes(filters.topic)) return false;
    if (filters.sheet && !p.sheets.includes(filters.sheet)) return false;
    if (filters.pattern && !p.patterns.includes(filters.pattern)) return false;
    if (filters.company && !p.companies.includes(filters.company)) return false;
    if (filters.status) {
      const prog = progress[p.id];
      if (filters.status === "unsolved" && prog?.status === "solved") return false;
      if (filters.status === "solved" && prog?.status !== "solved") return false;
      if (filters.status === "review" && prog?.status !== "review") return false;
      if (filters.status === "bookmarked" && !prog?.bookmarked) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === "id") cmp = a.id - b.id;
    else if (sortCol === "title") cmp = a.title.localeCompare(b.title);
    else if (sortCol === "difficulty") { const order = { Easy: 0, Medium: 1, Hard: 2 }; cmp = order[a.difficulty] - order[b.difficulty]; }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (col: string) => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(true); } };

  const filterConfigs = [
    { name: "difficulty", placeholder: "All Difficulty", options: ["Easy", "Medium", "Hard"].map((d) => ({ label: d, value: d })) },
    { name: "topic", placeholder: "All Topics", options: topics.map((t) => ({ label: t, value: t })) },
    { name: "sheet", placeholder: "All Sheets", options: sheets.map((s) => ({ label: s, value: s })) },
    { name: "pattern", placeholder: "All Patterns", options: patterns.map((p) => ({ label: p, value: p })) },
    { name: "company", placeholder: "All Companies", options: companies.map((c) => ({ label: c, value: c })) },
    { name: "status", placeholder: "All Status", options: [{ label: "Solved", value: "solved" }, { label: "Unsolved", value: "unsolved" }, { label: "Review Due", value: "review" }, { label: "Bookmarked", value: "bookmarked" }] },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Problems ({sorted.length})</h1>
      <FilterBar filters={filterConfigs} values={filters} onFilter={(name, value) => setFilters((f) => ({ ...f, [name]: value }))} searchValue={search} onSearch={setSearch} />
      <div className="card" style={{ overflow: "auto" }}>
        <table>
          <thead><tr>
            <th style={{ width: 50 }}>Status</th>
            <th style={{ cursor: "pointer", width: 60 }} onClick={() => handleSort("id")}># {sortCol === "id" ? (sortAsc ? "\u2191" : "\u2193") : ""}</th>
            <th style={{ cursor: "pointer" }} onClick={() => handleSort("title")}>Problem {sortCol === "title" ? (sortAsc ? "\u2191" : "\u2193") : ""}</th>
            <th style={{ cursor: "pointer", width: 100 }} onClick={() => handleSort("difficulty")}>Difficulty</th>
            <th>Topics</th><th>Patterns</th><th>Sheets</th>
          </tr></thead>
          <tbody>
            {sorted.map((p) => {
              const prog = progress[p.id];
              const statusIcon = prog?.bookmarked ? "\u2B50" : prog?.status === "solved" ? "\u2705" : prog?.status === "review" ? "\u{1F504}" : "\u2B55";
              return (<tr key={p.id}>
                <td>{statusIcon}</td><td>{p.id}</td>
                <td><Link href={`/problems/${p.id}`} style={{ color: "var(--text-primary)" }}>{p.title}</Link></td>
                <td><span className={`chip chip-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span></td>
                <td style={{ fontSize: 12 }}>{p.topics.slice(0, 2).join(", ")}</td>
                <td style={{ fontSize: 12 }}>{p.patterns.slice(0, 2).join(", ")}</td>
                <td style={{ fontSize: 12 }}>{p.sheets.length} sheets</td>
              </tr>);
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Create `src/app/problems/[id]/page.tsx` (Problem Workspace)
```typescript
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Timer from "@/components/Timer";
import { EnrichedProblem, ProblemProgress, Approach } from "@/lib/types";
import { calculateSM2 } from "@/lib/sm2";

export default function ProblemWorkspace() {
  const { id } = useParams();
  const [problem, setProblem] = useState<EnrichedProblem | null>(null);
  const [progress, setProgress] = useState<ProblemProgress | null>(null);
  const [notes, setNotes] = useState("");
  const [personalDiff, setPersonalDiff] = useState(0);
  const [showApproachForm, setShowApproachForm] = useState(false);
  const [newApproach, setNewApproach] = useState<Approach>({ name: "", description: "", timeComplexity: "", spaceComplexity: "" });

  useEffect(() => {
    fetch(`/api/problems/${id}`).then((r) => r.json()).then(setProblem);
    fetch(`/api/progress/${id}`).then((r) => { if (r.ok) return r.json(); return null; }).then((p) => {
      if (p) { setProgress(p); setNotes(p.notes || ""); setPersonalDiff(p.personalDifficulty || 0); }
    });
  }, [id]);

  const saveProgress = async (updates: Partial<ProblemProgress>) => {
    const res = await fetch(`/api/progress/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    const updated = await res.json();
    setProgress(updated);
  };

  const markSolved = async () => {
    const today = new Date().toLocaleDateString("en-CA");
    await saveProgress({ status: "solved", solveCount: (progress?.solveCount || 0) + 1, lastSolved: today });
    const streaks = await fetch("/api/streaks").then((r) => r.json());
    const todayCount = (streaks.activityLog[today] || 0) + 1;
    streaks.activityLog[today] = todayCount;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA");
    if (streaks.activityLog[yesterdayStr] || todayCount > 1) { streaks.currentStreak = (streaks.currentStreak || 0) + (todayCount === 1 ? 1 : 0); } else if (todayCount === 1) { streaks.currentStreak = 1; }
    streaks.longestStreak = Math.max(streaks.longestStreak, streaks.currentStreak);
    await fetch("/api/streaks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(streaks) });
  };

  const handleReview = async (quality: number) => {
    if (!progress) return;
    const result = calculateSM2(quality, progress.repetitions, progress.interval, progress.easeFactor);
    await saveProgress({ ...result, status: quality >= 3 ? "solved" : "review" });
  };

  const addApproach = async () => {
    if (!newApproach.name) return;
    const approaches = [...(progress?.approaches || []), newApproach];
    await saveProgress({ approaches });
    setNewApproach({ name: "", description: "", timeComplexity: "", spaceComplexity: "" });
    setShowApproachForm(false);
  };

  if (!problem) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><h1 style={{ display: "inline" }}>{problem.title}</h1><span className={`chip chip-${problem.difficulty.toLowerCase()}`} style={{ marginLeft: 12 }}>{problem.difficulty}</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => saveProgress({ bookmarked: !progress?.bookmarked })}>{progress?.bookmarked ? "\u2B50 Bookmarked" : "\u2606 Bookmark"}</button>
          <a href={problem.url} target="_blank" rel="noopener noreferrer" className="btn">Open on LeetCode</a>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {problem.topics.map((t) => <span key={t} className="chip chip-topic">{t}</span>)}
        {problem.patterns.map((p) => <span key={p} className="chip chip-pattern">{p}</span>)}
        {problem.sheets.map((s) => <span key={s} className="chip chip-sheet">{s}</span>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}><h3 style={{ marginBottom: 8 }}>Notes</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => saveProgress({ notes })} style={{ width: "100%", minHeight: 120, resize: "vertical" }} placeholder="Write your notes here..." />
          </div>
          <div className="card" style={{ marginBottom: 16 }}><h3 style={{ marginBottom: 8 }}>Personal Difficulty</h3>
            <div style={{ display: "flex", gap: 8 }}>
              {[1,2,3,4,5].map((d) => (<button key={d} onClick={() => { setPersonalDiff(d); saveProgress({ personalDifficulty: d }); }} style={{ background: d <= personalDiff ? "var(--accent-primary)" : "var(--bg-secondary)", color: d <= personalDiff ? "white" : "var(--text-primary)", width: 40, height: 40, borderRadius: 8 }}>{d}</button>))}
            </div>
          </div>
          <div className="card" style={{ marginBottom: 16 }}><h3 style={{ marginBottom: 8 }}>Stats</h3>
            <div style={{ fontSize: 14, display: "grid", gap: 4 }}>
              <div>Times Solved: <strong>{progress?.solveCount || 0}</strong></div>
              <div>Last Solved: <strong>{progress?.lastSolved || "Never"}</strong></div>
              <div>Time Taken: <strong>{progress?.timesTaken?.length ? `${progress.timesTaken[progress.timesTaken.length - 1]} min` : "N/A"}</strong></div>
            </div>
          </div>
          <div className="card"><h3 style={{ marginBottom: 8 }}>Actions</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={markSolved}>Mark as Solved</button>
              <button onClick={() => saveProgress({ status: "review" })}>Add to Review</button>
            </div>
          </div>
        </div>
        <div>
          <div className="card" style={{ marginBottom: 16 }}><h3 style={{ marginBottom: 12 }}>Timer</h3>
            <Timer onComplete={(mins) => { if (mins > 0) { const times = [...(progress?.timesTaken || []), mins]; saveProgress({ timesTaken: times }); } }} />
          </div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3>Solution Approaches</h3><button onClick={() => setShowApproachForm(!showApproachForm)}>+ Add</button></div>
            {showApproachForm && (<div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <input placeholder="Approach name" value={newApproach.name} onChange={(e) => setNewApproach({ ...newApproach, name: e.target.value })} style={{ width: "100%", marginBottom: 8 }} />
              <textarea placeholder="Description" value={newApproach.description} onChange={(e) => setNewApproach({ ...newApproach, description: e.target.value })} style={{ width: "100%", minHeight: 60, marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input placeholder="Time: O(?)" value={newApproach.timeComplexity} onChange={(e) => setNewApproach({ ...newApproach, timeComplexity: e.target.value })} style={{ flex: 1 }} />
                <input placeholder="Space: O(?)" value={newApproach.spaceComplexity} onChange={(e) => setNewApproach({ ...newApproach, spaceComplexity: e.target.value })} style={{ flex: 1 }} />
              </div>
              <button className="btn-primary" onClick={addApproach}>Save Approach</button>
            </div>)}
            {(progress?.approaches || []).map((a, i) => (<div key={i} style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{a.description}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}><span style={{ color: "var(--warning)" }}>{a.timeComplexity}</span>{a.spaceComplexity && <span style={{ color: "var(--accent-secondary)", marginLeft: 8 }}>{a.spaceComplexity}</span>}</div>
            </div>))}
          </div>
          <div className="card"><h3 style={{ marginBottom: 8 }}>Spaced Repetition Review</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Rate your recall quality (0=forgot, 5=perfect)</p>
            <div style={{ display: "flex", gap: 6 }}>{[0,1,2,3,4,5].map((q) => (<button key={q} onClick={() => handleReview(q)} style={{ flex: 1 }}>{q}</button>))}</div>
            {progress?.nextReview && (<div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Next review: {progress.nextReview} (interval: {progress.interval} days)</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Create `src/app/roadmap/page.tsx`
```typescript
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopicGraph from "@/components/TopicGraph";
interface TopicWithStats { id: string; name: string; prerequisites: string[]; totalProblems: number; solved: number; problemIds: number[]; }
export default function RoadmapPage() {
  const [topics, setTopics] = useState<TopicWithStats[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithStats | null>(null);
  const router = useRouter();
  useEffect(() => { fetch("/api/topics").then((r) => r.json()).then(setTopics); }, []);
  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Learning Roadmap</h1>
      <div className="card" style={{ marginBottom: 24 }}><TopicGraph topics={topics} onTopicClick={(id) => setSelectedTopic(topics.find((t) => t.id === id) || null)} /></div>
      {selectedTopic && (<div className="card">
        <h3 style={{ marginBottom: 8 }}>{selectedTopic.name}</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>{selectedTopic.solved} / {selectedTopic.totalProblems} problems solved</p>
        <button className="btn-primary" onClick={() => router.push(`/problems?topic=${selectedTopic.name}`)}>View Problems</button>
      </div>)}
    </div>
  );
}
```

### Create `src/app/analytics/page.tsx`
```typescript
"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import ProgressBar from "@/components/ProgressBar";
import { ProblemProgress, EnrichedProblem } from "@/lib/types";
interface SheetWithStats { name: string; totalProblems: number; solved: number; }
interface TopicWithStats { name: string; totalProblems: number; solved: number; }
export default function AnalyticsPage() {
  const [progress, setProgress] = useState<Record<number, ProblemProgress>>({});
  const [problems, setProblems] = useState<EnrichedProblem[]>([]);
  const [sheets, setSheets] = useState<SheetWithStats[]>([]);
  const [topics, setTopics] = useState<TopicWithStats[]>([]);
  const [streaks, setStreaks] = useState({ activityLog: {} as Record<string, number> });
  useEffect(() => {
    Promise.all([fetch("/api/progress").then((r) => r.json()), fetch("/api/problems").then((r) => r.json()), fetch("/api/sheets").then((r) => r.json()), fetch("/api/topics").then((r) => r.json()), fetch("/api/streaks").then((r) => r.json())])
      .then(([prog, prob, sh, top, str]) => { setProgress(prog); setProblems(prob); setSheets(sh); setTopics(top); setStreaks(str); });
  }, []);
  const solved = Object.values(progress).filter((p) => p.status === "solved");
  const diffData = [
    { name: "Easy", count: solved.filter((p) => problems.find((pr) => pr.id === p.problemId)?.difficulty === "Easy").length, fill: "var(--easy)" },
    { name: "Medium", count: solved.filter((p) => problems.find((pr) => pr.id === p.problemId)?.difficulty === "Medium").length, fill: "var(--medium)" },
    { name: "Hard", count: solved.filter((p) => problems.find((pr) => pr.id === p.problemId)?.difficulty === "Hard").length, fill: "var(--hard)" },
  ];
  const weakTopics = [...topics].sort((a, b) => { const aPct = a.totalProblems > 0 ? a.solved / a.totalProblems : 0; const bPct = b.totalProblems > 0 ? b.solved / b.totalProblems : 0; return aPct - bPct; }).slice(0, 5);
  const weeklyData: { week: string; count: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) { const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - i * 7); let count = 0; for (let d = 0; d < 7; d++) { const day = new Date(weekStart); day.setDate(day.getDate() + d); count += streaks.activityLog[day.toLocaleDateString("en-CA")] || 0; } weeklyData.push({ week: `W${12 - i}`, count }); }
  const avgTimes: Record<string, { total: number; count: number }> = { Easy: { total: 0, count: 0 }, Medium: { total: 0, count: 0 }, Hard: { total: 0, count: 0 } };
  for (const p of solved) { const prob = problems.find((pr) => pr.id === p.problemId); if (prob && p.timesTaken.length > 0) { const avg = p.timesTaken.reduce((a, b) => a + b, 0) / p.timesTaken.length; avgTimes[prob.difficulty].total += avg; avgTimes[prob.difficulty].count += 1; } }
  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Analytics</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="card"><h3 style={{ marginBottom: 12 }}>Difficulty Distribution</h3>
          <ResponsiveContainer width="100%" height={200}><BarChart data={diffData}><XAxis dataKey="name" stroke="var(--text-muted)" /><YAxis stroke="var(--text-muted)" /><Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} /><Bar dataKey="count" radius={[4, 4, 0, 0]}>{diffData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}</Bar></BarChart></ResponsiveContainer>
        </div>
        <div className="card"><h3 style={{ marginBottom: 12 }}>Weak Topics (Need Practice)</h3>{weakTopics.map((t) => (<ProgressBar key={t.name} label={t.name} value={t.solved} max={t.totalProblems} color="var(--danger)" />))}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="card"><h3 style={{ marginBottom: 12 }}>Average Solve Time</h3><div style={{ fontSize: 14 }}>
          {["Easy", "Medium", "Hard"].map((d) => { const data = avgTimes[d]; const avg = data.count > 0 ? Math.round(data.total / data.count) : 0; return (<div key={d} style={{ padding: "6px 0" }}><span style={{ color: `var(--${d.toLowerCase()})` }}>{d}:</span> {avg > 0 ? `${avg} min avg` : "No data"}</div>); })}
        </div></div>
        <div className="card"><h3 style={{ marginBottom: 12 }}>Weekly Trend</h3>
          <ResponsiveContainer width="100%" height={200}><LineChart data={weeklyData}><XAxis dataKey="week" stroke="var(--text-muted)" /><YAxis stroke="var(--text-muted)" /><Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} /><Line type="monotone" dataKey="count" stroke="var(--accent-primary)" strokeWidth={2} /></LineChart></ResponsiveContainer>
        </div>
      </div>
      <div className="card"><h3 style={{ marginBottom: 12 }}>Sheet Completion</h3>{sheets.map((s) => (<ProgressBar key={s.name} label={`${s.name} (${s.solved}/${s.totalProblems})`} value={s.solved} max={s.totalProblems} />))}</div>
    </div>
  );
}
```

### Create `src/app/practice/page.tsx`
```typescript
"use client";
import { useEffect, useState } from "react";
import Timer from "@/components/Timer";
import ProblemCard from "@/components/ProblemCard";
import { EnrichedProblem } from "@/lib/types";
export default function PracticePage() {
  const [topics, setTopics] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [filters, setFilters] = useState({ topic: "", difficulty: "", pattern: "", status: "unsolved" });
  const [currentProblem, setCurrentProblem] = useState<EnrichedProblem | null>(null);
  const [suggested, setSuggested] = useState<EnrichedProblem[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    Promise.all([fetch("/api/topics").then((r) => r.json()), fetch("/api/patterns").then((r) => r.json())]).then(([top, pat]) => {
      setTopics(top.map((t: { name: string }) => t.name)); setPatterns(pat.map((p: { name: string }) => p.name));
    });
    fetch("/api/review").then((r) => r.json()).then(async (review) => {
      if (review.length > 0) { const probs = await fetch("/api/problems").then((r) => r.json()); setSuggested(review.slice(0, 3).map((r: { problemId: number }) => probs.find((p: EnrichedProblem) => p.id === r.problemId)).filter(Boolean)); }
    });
  }, []);
  const pickRandom = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.topic) params.set("topic", filters.topic); if (filters.difficulty) params.set("difficulty", filters.difficulty);
    if (filters.pattern) params.set("pattern", filters.pattern); if (filters.status) params.set("status", filters.status);
    const res = await fetch(`/api/random?${params}`);
    setCurrentProblem(res.ok ? await res.json() : null); setLoading(false);
  };
  const markSolved = async () => {
    if (!currentProblem) return;
    const existing = await fetch(`/api/progress/${currentProblem.id}`).then((r) => r.ok ? r.json() : null);
    await fetch(`/api/progress/${currentProblem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "solved", solveCount: (existing?.solveCount || 0) + 1, lastSolved: new Date().toLocaleDateString("en-CA") }) });
  };
  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Practice</h1>
      <div className="card" style={{ marginBottom: 24, textAlign: "center", padding: 32 }}>
        <h2 style={{ marginBottom: 16 }}>What do you want to practice?</h2>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
          <select value={filters.topic} onChange={(e) => setFilters({ ...filters, topic: e.target.value })}><option value="">Any Topic</option>{topics.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <select value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}><option value="">Any Difficulty</option><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select>
          <select value={filters.pattern} onChange={(e) => setFilters({ ...filters, pattern: e.target.value })}><option value="">Any Pattern</option>{patterns.map((p) => <option key={p} value={p}>{p}</option>)}</select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Any Status</option><option value="unsolved">Unsolved Only</option><option value="review">Review Due</option></select>
        </div>
        <button className="btn-primary" onClick={pickRandom} disabled={loading} style={{ padding: "12px 32px", fontSize: 16 }}>{loading ? "Picking..." : "Pick Random Problem"}</button>
      </div>
      {currentProblem && (<div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div><h3>{currentProblem.title}</h3><div style={{ display: "flex", gap: 6, marginTop: 6 }}><span className={`chip chip-${currentProblem.difficulty.toLowerCase()}`}>{currentProblem.difficulty}</span>{currentProblem.topics.map((t) => <span key={t} className="chip chip-topic">{t}</span>)}</div></div>
          <a href={currentProblem.url} target="_blank" rel="noopener noreferrer" className="btn">Open on LeetCode</a>
        </div>
        <Timer onComplete={async (mins) => { if (mins > 0 && currentProblem) { const existing = await fetch(`/api/progress/${currentProblem.id}`).then((r) => r.ok ? r.json() : null); fetch(`/api/progress/${currentProblem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timesTaken: [...(existing?.timesTaken || []), mins] }) }); } }} />
        <div style={{ marginTop: 16, textAlign: "center" }}><button className="btn-primary" onClick={markSolved}>Mark as Solved</button></div>
      </div>)}
      {suggested.length > 0 && (<div className="card"><h3 style={{ marginBottom: 12 }}>Suggested (Due for Review)</h3>{suggested.map((p) => (<ProblemCard key={p.id} id={p.id} title={p.title} difficulty={p.difficulty} topics={p.topics} status="review" />))}</div>)}
    </div>
  );
}
```

### Create `src/app/contests/page.tsx`
```typescript
"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Contest } from "@/lib/types";
const emptyContest = { date: "", platform: "LeetCode" as const, name: "", rank: 0, problemsSolved: 0, totalProblems: 0, rating: undefined as number | undefined, ratingChange: undefined as number | undefined };
export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyContest);
  useEffect(() => { fetch("/api/contests").then((r) => r.json()).then(setContests); }, []);
  const addContest = async () => {
    const res = await fetch("/api/contests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const created = await res.json();
    setContests([created, ...contests]); setForm(emptyContest); setShowForm(false);
  };
  const deleteContest = async (id: string) => { await fetch(`/api/contests/${id}`, { method: "DELETE" }); setContests(contests.filter((c) => c.id !== id)); };
  const ratingData = contests.filter((c) => c.rating).reverse().map((c) => ({ date: c.date, rating: c.rating }));
  const avgRank = contests.length > 0 ? Math.round(contests.reduce((a, c) => a + c.rank, 0) / contests.length) : 0;
  const bestRank = contests.length > 0 ? Math.min(...contests.map((c) => c.rank)) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}><h1>Contests</h1><button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Log Contest</button></div>
      {showForm && (<div className="card" style={{ marginBottom: 24 }}><h3 style={{ marginBottom: 12 }}>Log New Contest</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as Contest["platform"] })}><option>LeetCode</option><option>Codeforces</option><option>CodeChef</option><option>Other</option></select>
          <input placeholder="Contest name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="number" placeholder="Rank" value={form.rank || ""} onChange={(e) => setForm({ ...form, rank: parseInt(e.target.value) || 0 })} />
          <input type="number" placeholder="Problems solved" value={form.problemsSolved || ""} onChange={(e) => setForm({ ...form, problemsSolved: parseInt(e.target.value) || 0 })} />
          <input type="number" placeholder="Total problems" value={form.totalProblems || ""} onChange={(e) => setForm({ ...form, totalProblems: parseInt(e.target.value) || 0 })} />
          <input type="number" placeholder="Rating (optional)" value={form.rating || ""} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) || undefined })} />
          <input type="number" placeholder="Rating change (optional)" value={form.ratingChange || ""} onChange={(e) => setForm({ ...form, ratingChange: parseInt(e.target.value) || undefined })} />
        </div>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={addContest}>Save Contest</button>
      </div>)}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-primary)" }}>{contests.length}</div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Total Contests</div></div>
        <div className="card" style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 700, color: "var(--success)" }}>{bestRank || "\u2014"}</div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Best Rank</div></div>
        <div className="card" style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 700, color: "var(--warning)" }}>{avgRank || "\u2014"}</div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Avg Rank</div></div>
      </div>
      {ratingData.length > 0 && (<div className="card" style={{ marginBottom: 24 }}><h3 style={{ marginBottom: 12 }}>Rating Progression</h3>
        <ResponsiveContainer width="100%" height={250}><LineChart data={ratingData}><XAxis dataKey="date" stroke="var(--text-muted)" /><YAxis stroke="var(--text-muted)" /><Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} /><Line type="monotone" dataKey="rating" stroke="var(--accent-primary)" strokeWidth={2} /></LineChart></ResponsiveContainer>
      </div>)}
      <div className="card"><h3 style={{ marginBottom: 12 }}>Contest History</h3>
        <table><thead><tr><th>Date</th><th>Platform</th><th>Contest</th><th>Rank</th><th>Solved</th><th>Rating</th><th></th></tr></thead>
          <tbody>{contests.map((c) => (<tr key={c.id}><td>{c.date}</td><td>{c.platform}</td><td>{c.name}</td><td>{c.rank.toLocaleString()}</td><td>{c.problemsSolved}/{c.totalProblems}</td>
            <td>{c.rating || "\u2014"}{c.ratingChange && (<span style={{ color: c.ratingChange > 0 ? "var(--success)" : "var(--danger)", marginLeft: 4 }}>{c.ratingChange > 0 ? "\u2191" : "\u2193"}{Math.abs(c.ratingChange)}</span>)}</td>
            <td><button onClick={() => deleteContest(c.id)} style={{ fontSize: 12, padding: "4px 8px" }}>Delete</button></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Step 13: Create Seed Data Files

Create these files in the `data/` directory:

### `data/progress.json`
```json
{}
```

### `data/streaks.json`
```json
{"currentStreak":0,"longestStreak":0,"activityLog":{}}
```

### `data/contests.json`
```json
[]
```

### `data/settings.json`
```json
{"theme":"dark-minimal","dailyGoal":3}
```

### `data/problems.json`, `data/topics.json`, `data/sheets.json`, `data/patterns.json`

These files are large (88 problems, 15 topics, 5 sheets, 18 patterns). Create them using the data from `docs/SEED-DATA.md` in this same project directory.

---

## Step 14: Final Verification

```bash
npm run dev
```

Open http://localhost:3000 and verify:
1. Dashboard loads with stat cards, heatmap, topic progress
2. /problems shows filterable problem table
3. /problems/1 shows Two Sum workspace with timer, notes, approaches
4. /roadmap shows topic dependency graph
5. /analytics shows charts (install recharts if not done)
6. /practice has random problem picker
7. /contests has contest logger
8. Theme switcher works across all 3 themes

```bash
npx tsc --noEmit  # Should have no errors
npm run build     # Should build successfully
```
