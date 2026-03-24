# DSA Tracker Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate 7 pages into 4, add study plan engine with daily queue, add Prep Mode for interview targeting, and overhaul UI to raw minimalist.

**Architecture:** Next.js App Router with file-based JSON persistence. New `/api/queue` endpoint computes daily problem queue server-side. WorkspacePanel replaces the dedicated problem page as a slide-over. Progress page merges dashboard/analytics/roadmap into tabs. Raw monochrome UI with monospace typography, no shadows, no rounded cards.

**Tech Stack:** Next.js 16, TypeScript, CSS Modules, Recharts, uuid

**Spec:** `docs/superpowers/specs/2026-03-24-dsa-tracker-redesign-design.md`

---

## File Map

### Delete:
- `src/app/roadmap/page.tsx`
- `src/app/analytics/page.tsx` + `Analytics.module.css`
- `src/app/practice/page.tsx` + `Practice.module.css`
- `src/app/problems/[id]/page.tsx` + `Workspace.module.css`
- `src/app/Dashboard.module.css`

### Create:
- `src/lib/queue.ts` — queue generation algorithm (pure function, no I/O)
- `src/app/api/queue/route.ts` — GET endpoint using queue.ts
- `src/app/progress/page.tsx` + `Progress.module.css`
- `src/components/WorkspacePanel.tsx` + `WorkspacePanel.module.css`
- `src/components/QueueList.tsx` + `QueueList.module.css`
- `src/components/PrepModeBanner.tsx` + `PrepModeBanner.module.css`
- `src/components/PrepModeModal.tsx` + `PrepModeModal.module.css`
- `src/components/TabNav.tsx` + `TabNav.module.css`
- `src/components/QuickLogModal.tsx` + `QuickLogModal.module.css`
- `src/components/CompanyCoverage.tsx` + `CompanyCoverage.module.css`
- `src/components/DifficultyTrend.tsx` + `DifficultyTrend.module.css`

### Rewrite:
- `src/lib/types.ts` — add PrepMode, QueuedProblem, QueueResponse
- `src/app/globals.css` — raw minimalist design system
- `src/app/layout.tsx` — new 4-link navbar with prep mode toggle
- `src/app/page.tsx` — Today page (queue + quick actions)
- `src/app/problems/page.tsx` — power table + slide-over
- `src/app/contests/page.tsx` — minor style refresh
- `src/components/Navbar.tsx` + `Navbar.module.css`
- `src/components/ThemeSwitcher.tsx` + `ThemeSwitcher.module.css`
- `src/components/StatCard.tsx` + `StatCard.module.css`
- `src/components/ProgressBar.tsx` + `ProgressBar.module.css`
- `src/components/Heatmap.tsx` + `Heatmap.module.css`
- `src/components/Timer.tsx` + `Timer.module.css`
- `src/components/FilterBar.tsx` + `FilterBar.module.css`
- `src/components/ProblemCard.tsx` + `ProblemCard.module.css`
- `src/components/TopicGraph.tsx` + `TopicGraph.module.css`

### Unchanged:
- `src/lib/data.ts`, `src/lib/sm2.ts`, `src/lib/enrichProblems.ts`, `src/lib/api-helpers.ts`
- `src/hooks/useTimer.ts`, `src/context/ThemeContext.tsx`
- All `data/*.json` files (settings.json gains prepMode at runtime)
- API routes: problems, progress, review, topics, sheets, patterns, random, streaks, contests, export, import

---

## Task 1: Data Model & Types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add PrepMode interface**

Add after the `Settings` interface:

```typescript
export interface PrepMode {
  active: boolean;
  company: string;   // matches Problem.companies[] values e.g. "Amazon"
  sheet: string;      // matches Sheet.id e.g. "blind-75", or "all"
  deadline: string;   // ISO date e.g. "2026-05-01"
}
```

- [ ] **Step 2: Update Settings interface**

Change `Settings` to:

```typescript
export interface Settings {
  theme: "dark-minimal" | "colorful" | "professional";
  dailyGoal: number;
  prepMode?: PrepMode;
}
```

- [ ] **Step 3: Add QueuedProblem and QueueResponse**

Add at the end of the file:

```typescript
export interface QueuedProblem extends EnrichedProblem {
  reason: "review_due" | "prep_target" | "weak_topic" | "sheet_fill";
}

export interface QueueResponse {
  queue: QueuedProblem[];
  progress: Record<number, ProblemProgress>;
  stats: {
    todaySolved: number;
    dailyGoal: number;
    adjustedGoal: number;
    streak: number;
    reviewDue: number;
    prepMode: PrepMode | null;
    prepSolved: number;   // problems solved matching prep target (0 if no prep)
    prepTotal: number;    // total problems matching prep target (0 if no prep)
  };
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

---

## Task 2: Queue Generation Engine

**Files:**
- Create: `src/lib/queue.ts`

This is a pure function with no I/O — takes all data as arguments, returns the queue. Keeps it testable and separates logic from data access.

- [ ] **Step 1: Create `src/lib/queue.ts`**

```typescript
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

  // Helper: check if problem is unsolved
  const isUnsolved = (id: number) => {
    const p = progress[id];
    return !p || p.status === "unsolved";
  };

  // --- Priority 1: Overdue SM-2 reviews ---
  const reviewDue = Object.values(progress).filter(
    (p) => p.status === "solved" && p.nextReview <= today
  );
  for (const r of reviewDue) {
    const prob = problems.find((p) => p.id === r.problemId);
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
    const targetProblemIds = targetSheet ? targetSheet.problemIds : problems.map((p) => p.id);
    const matching = problems.filter(
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
    // --- Priority 2 (Default): Weak topics ---
    const topicStats = topics.map((t) => {
      const solved = t.problemIds.filter((id) => progress[id]?.status === "solved").length;
      return { ...t, solved, total: t.problemIds.length, pct: t.problemIds.length > 0 ? solved / t.problemIds.length : 1 };
    });
    const weak = topicStats
      .filter((t) => t.pct < 1 && t.problemIds.some((id) => isUnsolved(id) && !usedIds.has(id)))
      .sort((a, b) => a.pct - b.pct || b.total - a.total)
      .slice(0, 3);

    for (const topic of weak) {
      if (queue.length >= adjustedGoal + reviewDueCount) break;
      const unsolved = topic.problemIds.find((id) => isUnsolved(id) && !usedIds.has(id));
      if (unsolved !== undefined) {
        const prob = problems.find((p) => p.id === unsolved);
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
        .map((id) => problems.find((p) => p.id === id)!)
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

---

## Task 3: Queue API Route

**Files:**
- Create: `src/app/api/queue/route.ts`

- [ ] **Step 1: Create the directory and route**

```bash
mkdir -p src/app/api/queue
```

- [ ] **Step 2: Write the route handler**

Create `src/app/api/queue/route.ts`:

```typescript
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

---

## Task 4: Raw Minimalist Design System

**Files:**
- Rewrite: `src/app/globals.css`

- [ ] **Step 1: Replace globals.css entirely**

This is the foundation — monochrome palette, monospace font, no shadows, sharp corners, dense layout. Everything else builds on this.

```css
/* === Reset === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* === Base === */
html {
  font-family: ui-monospace, 'Cascadia Code', 'JetBrains Mono', 'Fira Mono', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.4;
}

body {
  background: var(--bg);
  color: var(--fg);
  min-height: 100vh;
}

a { color: var(--fg); text-decoration: none; }
a:hover { text-decoration: underline; }

/* === Dark Minimal (primary) === */
[data-theme="dark-minimal"] {
  --bg: #111; --bg-alt: #1a1a1a; --bg-hover: #222;
  --fg: #ccc; --fg-dim: #888; --fg-faint: #555;
  --border: #2a2a2a;
  --accent: #8ab4f8;
  --easy: #6a9955; --medium: #d7ba7d; --hard: #d16969;
  --solved: #6a9955; --review: #d7ba7d; --unsolved: #555;
}

/* === Colorful === */
[data-theme="colorful"] {
  --bg: #0a0a1a; --bg-alt: #12122a; --bg-hover: #1a1a3a;
  --fg: #ddd; --fg-dim: #999; --fg-faint: #666;
  --border: #2a2a4a;
  --accent: #6cf;
  --easy: #4c8; --medium: #ec4; --hard: #e55;
  --solved: #4c8; --review: #ec4; --unsolved: #666;
}

/* === Professional === */
[data-theme="professional"] {
  --bg: #fafafa; --bg-alt: #f0f0f0; --bg-hover: #e8e8e8;
  --fg: #222; --fg-dim: #666; --fg-faint: #999;
  --border: #ddd;
  --accent: #3b82f6;
  --easy: #16a34a; --medium: #d97706; --hard: #dc2626;
  --solved: #16a34a; --review: #d97706; --unsolved: #999;
}

/* === Layout === */
.container { max-width: 1200px; margin: 0 auto; padding: 16px 20px; }

/* === Dividers (no cards) === */
.divider { border-top: 1px solid var(--border); margin: 16px 0; }

/* === Typography === */
h1 { font-size: 16px; font-weight: 600; }
h2 { font-size: 14px; font-weight: 600; }
h3 { font-size: 13px; font-weight: 600; color: var(--fg-dim); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }

/* === Chips === */
.chip { display: inline-block; padding: 1px 6px; border: 1px solid var(--border); font-size: 11px; }
.chip-easy { color: var(--easy); border-color: var(--easy); }
.chip-medium { color: var(--medium); border-color: var(--medium); }
.chip-hard { color: var(--hard); border-color: var(--hard); }
.chip-topic { color: var(--fg-dim); }
.chip-pattern { color: var(--fg-dim); }
.chip-sheet { color: var(--fg-dim); }

/* === Status dots === */
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.dot-solved { background: var(--solved); }
.dot-review { background: var(--review); }
.dot-unsolved { border: 1px solid var(--unsolved); background: transparent; }

/* === Buttons === */
button, .btn {
  padding: 4px 10px; border: 1px solid var(--border); border-radius: 2px;
  background: transparent; color: var(--fg); cursor: pointer;
  font-family: inherit; font-size: 12px;
}
button:hover, .btn:hover { background: var(--bg-hover); }
.btn-primary { background: var(--fg); color: var(--bg); border-color: var(--fg); }
.btn-primary:hover { opacity: 0.85; }
.btn-ghost { border: none; padding: 4px 8px; }
.btn-ghost:hover { background: var(--bg-hover); }

/* === Inputs === */
input, select, textarea {
  padding: 4px 8px; border: 1px solid var(--border); border-radius: 2px;
  background: var(--bg-alt); color: var(--fg); font-family: inherit; font-size: 12px;
  outline: none;
}
input:focus, select:focus, textarea:focus { border-color: var(--fg-dim); }

/* === Table === */
table { width: 100%; border-collapse: collapse; }
th {
  text-align: left; padding: 6px 10px; font-size: 11px; font-weight: 600;
  color: var(--fg-faint); text-transform: uppercase; letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
}
td { padding: 6px 10px; font-size: 13px; border-bottom: 1px solid var(--border); }
tr:hover { background: var(--bg-hover); }

/* === Utility === */
.fg-dim { color: var(--fg-dim); }
.fg-faint { color: var(--fg-faint); }
.text-sm { font-size: 11px; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.mb-4 { margin-bottom: 4px; }
.mb-8 { margin-bottom: 8px; }
.mb-12 { margin-bottom: 12px; }
.mb-16 { margin-bottom: 16px; }
.mb-24 { margin-bottom: 24px; }
.mt-8 { margin-top: 8px; }
.mt-16 { margin-top: 16px; }
.flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-4 { gap: 4px; }
.gap-6 { gap: 6px; }
.gap-8 { gap: 8px; }
.gap-12 { gap: 12px; }
.gap-16 { gap: 16px; }
.w-full { width: 100%; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
```

- [ ] **Step 2: Verify no CSS syntax errors**

Run: `npx next build`
Expected: compiles successfully (pages may error due to missing CSS classes — that's expected at this stage)

---

## Task 5: Navbar & Layout Overhaul

**Files:**
- Rewrite: `src/app/layout.tsx`
- Rewrite: `src/components/Navbar.tsx` + `Navbar.module.css`
- Rewrite: `src/components/ThemeSwitcher.tsx` + `ThemeSwitcher.module.css`

- [ ] **Step 1: Rewrite Navbar.module.css**

```css
.nav { border-bottom: 1px solid var(--border); padding: 0 20px; display: flex; align-items: center; height: 40px; max-width: 1200px; margin: 0 auto; gap: 20px; }
.logo { font-size: 13px; font-weight: 700; color: var(--fg); text-decoration: none; flex-shrink: 0; }
.links { display: flex; gap: 2px; flex: 1; }
.link { padding: 4px 10px; font-size: 12px; color: var(--fg-dim); text-decoration: none; }
.link:hover { color: var(--fg); text-decoration: none; }
.active { color: var(--fg); font-weight: 600; }
.right { display: flex; align-items: center; gap: 8px; }
.prepToggle { font-size: 11px; padding: 2px 8px; cursor: pointer; }
.prepActive { color: var(--easy); border-color: var(--easy); }
```

- [ ] **Step 2: Rewrite Navbar.tsx**

```typescript
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import ThemeSwitcher from "./ThemeSwitcher";
import PrepModeModal from "./PrepModeModal";
import styles from "./Navbar.module.css";

const links = [
  { href: "/", label: "Today" },
  { href: "/problems", label: "Problems" },
  { href: "/progress", label: "Progress" },
  { href: "/contests", label: "Contests" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [prepActive, setPrepActive] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      setPrepActive(!!s.prepMode?.active);
    }).catch(() => {});
  }, []);

  return (
    <>
      <nav style={{ borderBottom: "1px solid var(--border)" }}>
        <div className={styles.nav}>
          <Link href="/" className={styles.logo}>dsa</Link>
          <div className={styles.links}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={`${styles.link} ${pathname === l.href ? styles.active : ""}`}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className={styles.right}>
            <button
              className={`${styles.prepToggle} ${prepActive ? styles.prepActive : ""}`}
              onClick={() => setShowPrepModal(true)}
            >
              {prepActive ? "● prep" : "prep"}
            </button>
            <ThemeSwitcher />
          </div>
        </div>
      </nav>
      {showPrepModal && (
        <PrepModeModal
          onClose={() => setShowPrepModal(false)}
          onSave={(active) => { setPrepActive(active); setShowPrepModal(false); }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Rewrite ThemeSwitcher.module.css**

```css
.switcher { display: flex; gap: 2px; }
.btn { padding: 2px 6px; font-size: 11px; color: var(--fg-faint); background: transparent; border: none; cursor: pointer; font-family: inherit; }
.btn:hover { color: var(--fg); }
.active { color: var(--fg); font-weight: 600; }
```

- [ ] **Step 4: Rewrite ThemeSwitcher.tsx**

```typescript
"use client";
import { useTheme } from "@/context/ThemeContext";
import styles from "./ThemeSwitcher.module.css";

const themes = [
  { value: "dark-minimal" as const, label: "dark" },
  { value: "colorful" as const, label: "color" },
  { value: "professional" as const, label: "light" },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <div className={styles.switcher}>
      {themes.map((t) => (
        <button key={t.value} className={`${styles.btn} ${theme === t.value ? styles.active : ""}`} onClick={() => setTheme(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Rewrite layout.tsx**

```typescript
import type { Metadata } from "next";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = { title: "dsa", description: "DSA Tracker" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark-minimal">
      <body>
        <ThemeProvider>
          <Navbar />
          <main className="container">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Skip build verification**

PrepModeModal import in Navbar will fail until Task 6 creates it. Proceed to Task 6 immediately.

---

## Task 6: Shared UI Components (New)

**Files:**
- Create: `src/components/TabNav.tsx` + `TabNav.module.css`
- Create: `src/components/PrepModeModal.tsx` + `PrepModeModal.module.css`
- Create: `src/components/PrepModeBanner.tsx` + `PrepModeBanner.module.css`
- Create: `src/components/QuickLogModal.tsx` + `QuickLogModal.module.css`

- [ ] **Step 1: TabNav**

`TabNav.module.css`:
```css
.tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
.tab { padding: 6px 14px; font-size: 12px; color: var(--fg-dim); background: transparent; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-family: inherit; }
.tab:hover { color: var(--fg); }
.active { color: var(--fg); border-bottom-color: var(--fg); font-weight: 600; }
```

`TabNav.tsx`:
```typescript
import styles from "./TabNav.module.css";
interface Props { tabs: string[]; active: string; onChange: (tab: string) => void; }
export default function TabNav({ tabs, active, onChange }: Props) {
  return (
    <div className={styles.tabs}>
      {tabs.map((t) => (
        <button key={t} className={`${styles.tab} ${active === t ? styles.active : ""}`} onClick={() => onChange(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: PrepModeModal**

`PrepModeModal.module.css`:
```css
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: center; justify-content: center; }
.modal { background: var(--bg); border: 1px solid var(--border); padding: 20px; width: 360px; }
.title { font-size: 14px; font-weight: 600; margin-bottom: 16px; }
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 11px; color: var(--fg-dim); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
.field select, .field input { width: 100%; }
.actions { display: flex; gap: 8px; margin-top: 16px; }
```

`PrepModeModal.tsx`:
```typescript
"use client";
import { useEffect, useState } from "react";
import styles from "./PrepModeModal.module.css";

interface Props { onClose: () => void; onSave: (active: boolean) => void; }

export default function PrepModeModal({ onClose, onSave }: Props) {
  const [company, setCompany] = useState("");
  const [sheet, setSheet] = useState("all");
  const [deadline, setDeadline] = useState("");
  const [companies, setCompanies] = useState<string[]>([]);
  const [sheets, setSheets] = useState<{ id: string; name: string }[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/problems").then((r) => r.json()),
      fetch("/api/sheets").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([probs, sh, settings]) => {
      const co = new Set<string>();
      probs.forEach((p: { companies: string[] }) => p.companies.forEach((c: string) => co.add(c)));
      setCompanies([...co].sort());
      setSheets(sh.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      if (settings.prepMode) {
        setCompany(settings.prepMode.company || "");
        setSheet(settings.prepMode.sheet || "all");
        setDeadline(settings.prepMode.deadline || "");
        setIsActive(settings.prepMode.active || false);
      }
    });
  }, []);

  const save = async (activate: boolean) => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prepMode: { active: activate, company, sheet, deadline },
      }),
    });
    onSave(activate);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>Prep Mode</div>
        <div className={styles.field}>
          <label>Company</label>
          <select value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">Select...</option>
            {companies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Sheet</label>
          <select value={sheet} onChange={(e) => setSheet(e.target.value)}>
            <option value="all">All sheets</option>
            {sheets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Deadline</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div className={styles.actions}>
          <button className="btn-primary" onClick={() => save(true)} disabled={!company || !deadline}>
            {isActive ? "Update" : "Activate"}
          </button>
          {isActive && <button onClick={() => save(false)}>Deactivate</button>}
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: PrepModeBanner**

`PrepModeBanner.module.css`:
```css
.banner { padding: 6px 0; font-size: 11px; color: var(--fg-dim); display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
.label { color: var(--fg); font-weight: 600; }
.bar { flex: 1; max-width: 120px; height: 4px; background: var(--border); }
.fill { height: 100%; background: var(--easy); }
```

`PrepModeBanner.tsx`:
```typescript
import styles from "./PrepModeBanner.module.css";
import { PrepMode } from "@/lib/types";

interface Props { prepMode: PrepMode; solved: number; total: number; }

export default function PrepModeBanner({ prepMode, solved, total }: Props) {
  const deadline = new Date(prepMode.deadline);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

  return (
    <div className={styles.banner}>
      <span className={styles.label}>prep:</span>
      <span>{prepMode.company}</span>
      <span>|</span>
      <span>{prepMode.sheet === "all" ? "all sheets" : prepMode.sheet}</span>
      <span>|</span>
      <span>{daysLeft === 0 ? "deadline today" : `${daysLeft}d left`}</span>
      <span>|</span>
      <span>{solved}/{total}</span>
      <div className={styles.bar}><div className={styles.fill} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
```

- [ ] **Step 4: QuickLogModal**

`QuickLogModal.module.css`:
```css
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: center; justify-content: center; }
.modal { background: var(--bg); border: 1px solid var(--border); padding: 20px; width: 360px; }
.title { font-size: 14px; font-weight: 600; margin-bottom: 16px; }
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 11px; color: var(--fg-dim); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
.field select, .field input { width: 100%; }
.actions { display: flex; gap: 8px; margin-top: 16px; }
```

`QuickLogModal.tsx`:
```typescript
"use client";
import { useEffect, useState } from "react";
import styles from "./QuickLogModal.module.css";

interface Props { onClose: () => void; onSaved: () => void; }

export default function QuickLogModal({ onClose, onSaved }: Props) {
  const [problems, setProblems] = useState<{ id: number; title: string }[]>([]);
  const [problemId, setProblemId] = useState<number | null>(null);
  const [time, setTime] = useState("");

  useEffect(() => {
    fetch("/api/problems").then((r) => r.json()).then((p) => setProblems(p.map((x: { id: number; title: string }) => ({ id: x.id, title: x.title }))));
  }, []);

  const save = async () => {
    if (!problemId) return;
    const today = new Date().toLocaleDateString("en-CA");
    const existing = await fetch(`/api/progress/${problemId}`).then((r) => r.ok ? r.json() : null);
    await fetch(`/api/progress/${problemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "solved",
        solveCount: (existing?.solveCount || 0) + 1,
        lastSolved: today,
        timesTaken: [...(existing?.timesTaken || []), time ? parseInt(time) : undefined].filter(Boolean),
      }),
    });
    // Update streak
    const streaks = await fetch("/api/streaks").then((r) => r.json());
    const todayCount = (streaks.activityLog[today] || 0) + 1;
    streaks.activityLog[today] = todayCount;
    if (todayCount === 1) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toLocaleDateString("en-CA");
      streaks.currentStreak = streaks.activityLog[yStr] ? streaks.currentStreak + 1 : 1;
    }
    streaks.longestStreak = Math.max(streaks.longestStreak, streaks.currentStreak);
    await fetch("/api/streaks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(streaks) });
    onSaved();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>Log a Solve</div>
        <div className={styles.field}>
          <label>Problem</label>
          <select value={problemId || ""} onChange={(e) => setProblemId(parseInt(e.target.value))}>
            <option value="">Select...</option>
            {problems.map((p) => <option key={p.id} value={p.id}>{p.id}. {p.title}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Time (minutes, optional)</label>
          <input type="number" value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 25" />
        </div>
        <div className={styles.actions}>
          <button className="btn-primary" onClick={save} disabled={!problemId}>Save</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors (all imports should now resolve)

---

## Task 7: Existing Component Restyling

**Files:**
- Rewrite CSS + minor TSX adjustments for: StatCard, ProgressBar, Heatmap, Timer, FilterBar, ProblemCard, TopicGraph

- [ ] **Step 1: StatCard**

`StatCard.module.css`:
```css
.card { padding: 8px 0; }
.value { font-size: 20px; font-weight: 700; }
.label { font-size: 11px; color: var(--fg-faint); margin-top: 2px; }
```

`StatCard.tsx`:
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

- [ ] **Step 2: ProgressBar**

`ProgressBar.module.css`:
```css
.bar { margin-bottom: 8px; }
.header { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
.pct { color: var(--fg-faint); font-variant-numeric: tabular-nums; }
.track { background: var(--border); height: 4px; }
.fill { height: 100%; transition: width 0.3s; }
```

`ProgressBar.tsx` — update default color from `var(--accent-primary)` to `var(--fg-dim)`:

```typescript
import styles from "./ProgressBar.module.css";
interface Props { label: string; value: number; max: number; color?: string; }
export default function ProgressBar({ label, value, max, color }: Props) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={styles.bar}>
      <div className={styles.header}><span>{label}</span><span className={styles.pct}>{pct}%</span></div>
      <div className={styles.track}><div className={styles.fill} style={{ width: `${pct}%`, background: color || "var(--fg-dim)" }} /></div>
    </div>
  );
}
```

- [ ] **Step 3: Heatmap**

`Heatmap.module.css`:
```css
.heatmap { overflow-x: auto; }
.grid { display: flex; flex-wrap: wrap; gap: 2px; }
.cell { width: 10px; height: 10px; }
.level0 { background: var(--bg-alt); }
.level1 { background: color-mix(in srgb, var(--solved) 25%, var(--bg-alt)); }
.level2 { background: color-mix(in srgb, var(--solved) 50%, var(--bg-alt)); }
.level3 { background: color-mix(in srgb, var(--solved) 75%, var(--bg-alt)); }
.level4 { background: var(--solved); }
```

- [ ] **Step 4: Timer**

`Timer.module.css`:
```css
.timer { text-align: center; padding: 8px 0; }
.display { font-size: 28px; font-weight: 700; color: var(--fg); margin-bottom: 8px; }
.controls { display: flex; gap: 6px; justify-content: center; }
```

`Timer.tsx`:
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
        {!running ? <button onClick={start} className="btn-primary">start</button> : <button onClick={pause}>pause</button>}
        <button onClick={() => { reset(); onComplete?.(minutes); }}>done</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: FilterBar**

`FilterBar.module.css`:
```css
.bar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.search { flex: 1; min-width: 160px; }
.select { min-width: 120px; }
```

- [ ] **Step 6: ProblemCard (add reason prop)**

`ProblemCard.module.css`:
```css
.card { display: block; padding: 8px 10px; border-bottom: 1px solid var(--border); text-decoration: none; color: var(--fg); cursor: pointer; }
.card:hover { background: var(--bg-hover); text-decoration: none; }
.header { display: flex; align-items: center; gap: 8px; }
.title { flex: 1; font-size: 13px; }
.reason { font-size: 10px; color: var(--fg-faint); }
.tags { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
```

`ProblemCard.tsx`:
```typescript
import styles from "./ProblemCard.module.css";
interface Props { id: number; title: string; difficulty: "Easy" | "Medium" | "Hard"; topics?: string[]; status?: string; reason?: string; onClick?: () => void; }
export default function ProblemCard({ id, title, difficulty, topics, status, reason, onClick }: Props) {
  const dotClass = status === "solved" ? "dot-solved" : status === "review" ? "dot-review" : "dot-unsolved";
  return (
    <div className={styles.card} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <div className={styles.header}>
        <span className={`dot ${dotClass}`} />
        <span className={styles.title}>{title}</span>
        <span className={`chip chip-${difficulty.toLowerCase()}`}>{difficulty}</span>
      </div>
      {(reason || (topics && topics.length > 0)) && (
        <div className={styles.tags}>
          {reason && <span className={styles.reason}>{reason}</span>}
          {topics?.slice(0, 2).map((t) => <span key={t} className="chip chip-topic">{t}</span>)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: TopicGraph (CSS + TSX rewrite to remove emojis)**

`TopicGraph.module.css`:
```css
.graph { display: flex; flex-direction: column; gap: 16px; align-items: center; padding: 12px; }
.tier { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.node { padding: 8px 14px; cursor: pointer; text-align: center; min-width: 130px; border: 1px solid var(--border); background: transparent; font-family: inherit; font-size: 12px; }
.node:hover { background: var(--bg-hover); }
.name { font-weight: 600; font-size: 12px; }
.stats { font-size: 11px; color: var(--fg-faint); margin-top: 2px; }
.statusLabel { font-size: 10px; margin-top: 4px; }
.complete { border-color: var(--solved); }
.complete .statusLabel { color: var(--solved); }
.inProgress { border-color: var(--accent); }
.inProgress .statusLabel { color: var(--accent); }
.available { border-color: var(--fg-dim); }
.available .statusLabel { color: var(--fg-dim); }
.locked { opacity: 0.35; cursor: default; }
.locked:hover { background: transparent; }
.locked .statusLabel { color: var(--fg-faint); }
```

`TopicGraph.tsx` — rewrite to remove emojis, use text status labels:
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
  const statusLabels: Record<string, string> = { complete: "done", inProgress: "started", available: "ready", locked: "locked" };
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
                <div className={styles.statusLabel}>{statusLabels[status]}</div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Verify build**

Run: `npx tsc --noEmit`

---

## Task 8: WorkspacePanel Component

**Files:**
- Create: `src/components/WorkspacePanel.tsx` + `WorkspacePanel.module.css`

- [ ] **Step 1: Create WorkspacePanel.module.css**

```css
/* Inline mode (Problems page) */
.panelInline { width: 45%; border-left: 1px solid var(--border); padding: 16px; overflow-y: auto; max-height: calc(100vh - 60px); position: sticky; top: 60px; }

/* Overlay mode (Today page) */
.overlay { position: fixed; inset: 0; z-index: 150; display: flex; justify-content: flex-end; }
.backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.4); }
.panelOverlay { position: relative; width: 420px; max-width: 90vw; background: var(--bg); border-left: 1px solid var(--border); padding: 16px; overflow-y: auto; animation: slideIn 200ms ease; }
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.close { background: none; border: none; color: var(--fg-dim); cursor: pointer; font-size: 16px; font-family: inherit; }
.close:hover { color: var(--fg); }
.title { font-size: 15px; font-weight: 600; }
.chips { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px; }
.section { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.sectionTitle { font-size: 11px; color: var(--fg-faint); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
.diffRow { display: flex; gap: 4px; }
.diffBtn { width: 28px; height: 28px; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.diffBtnActive { background: var(--fg); color: var(--bg); border-color: var(--fg); }
.approachItem { padding: 8px 0; border-bottom: 1px solid var(--border); }
.approachName { font-weight: 600; font-size: 12px; }
.approachDesc { font-size: 12px; color: var(--fg-dim); margin-top: 2px; }
.approachMeta { font-size: 11px; color: var(--fg-faint); margin-top: 2px; }
.reviewRow { display: flex; gap: 4px; }
.reviewBtn { flex: 1; font-size: 12px; }
.stat { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
.actions { display: flex; gap: 6px; }
.approachForm { border: 1px solid var(--border); padding: 10px; margin-bottom: 8px; }
.approachFormRow { display: flex; gap: 6px; }
```

- [ ] **Step 2: Create WorkspacePanel.tsx**

```typescript
"use client";
import { useEffect, useState } from "react";
import Timer from "./Timer";
import styles from "./WorkspacePanel.module.css";
import { EnrichedProblem, ProblemProgress, Approach } from "@/lib/types";
import { calculateSM2 } from "@/lib/sm2";

interface Props {
  problemId: number;
  mode: "inline" | "overlay";
  onClose: () => void;
}

export default function WorkspacePanel({ problemId, mode, onClose }: Props) {
  const [problem, setProblem] = useState<EnrichedProblem | null>(null);
  const [progress, setProgress] = useState<ProblemProgress | null>(null);
  const [notes, setNotes] = useState("");
  const [personalDiff, setPersonalDiff] = useState(0);
  const [showApproachForm, setShowApproachForm] = useState(false);
  const [newApproach, setNewApproach] = useState<Approach>({ name: "", description: "", timeComplexity: "", spaceComplexity: "" });

  useEffect(() => {
    fetch(`/api/problems/${problemId}`).then((r) => r.json()).then(setProblem);
    fetch(`/api/progress/${problemId}`).then((r) => { if (r.ok) return r.json(); return null; }).then((p) => {
      if (p) { setProgress(p); setNotes(p.notes || ""); setPersonalDiff(p.personalDifficulty || 0); }
    });
  }, [problemId]);

  const saveProgress = async (updates: Partial<ProblemProgress>) => {
    const res = await fetch(`/api/progress/${problemId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
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
    const yStr = yesterday.toLocaleDateString("en-CA");
    if (streaks.activityLog[yStr] || todayCount > 1) { streaks.currentStreak = (streaks.currentStreak || 0) + (todayCount === 1 ? 1 : 0); } else if (todayCount === 1) { streaks.currentStreak = 1; }
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
    await saveProgress({ approaches: [...(progress?.approaches || []), newApproach] });
    setNewApproach({ name: "", description: "", timeComplexity: "", spaceComplexity: "" });
    setShowApproachForm(false);
  };

  if (!problem) return null;

  const panel = (
    <div className={mode === "inline" ? styles.panelInline : styles.panelOverlay}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>{problem.title}</div>
          <span className={`chip chip-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.chips}>
        {problem.topics.map((t) => <span key={t} className="chip chip-topic">{t}</span>)}
        {problem.patterns.map((p) => <span key={p} className="chip chip-pattern">{p}</span>)}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Timer</div>
        <Timer onComplete={(mins) => { if (mins > 0) saveProgress({ timesTaken: [...(progress?.timesTaken || []), mins] }); }} />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Notes</div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => saveProgress({ notes })} className="w-full" style={{ minHeight: 80, resize: "vertical" }} placeholder="Notes..." />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Difficulty</div>
        <div className={styles.diffRow}>
          {[1,2,3,4,5].map((d) => (
            <button key={d} className={`${styles.diffBtn} ${d <= personalDiff ? styles.diffBtnActive : ""}`} onClick={() => { setPersonalDiff(d); saveProgress({ personalDifficulty: d }); }}>{d}</button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Stats</div>
        <div className={styles.stat}><span className="fg-dim">Solved</span><span>{progress?.solveCount || 0}x</span></div>
        <div className={styles.stat}><span className="fg-dim">Last</span><span>{progress?.lastSolved || "never"}</span></div>
        <div className={styles.stat}><span className="fg-dim">Time</span><span>{progress?.timesTaken?.length ? `${progress.timesTaken[progress.timesTaken.length - 1]}m` : "—"}</span></div>
      </div>

      <div className={styles.section}>
        <div className="flex justify-between items-center mb-8">
          <div className={styles.sectionTitle} style={{ margin: 0 }}>Approaches</div>
          <button className="btn-ghost" onClick={() => setShowApproachForm(!showApproachForm)}>+ add</button>
        </div>
        {showApproachForm && (
          <div className={styles.approachForm}>
            <input placeholder="Name" value={newApproach.name} onChange={(e) => setNewApproach({ ...newApproach, name: e.target.value })} className="w-full mb-4" />
            <textarea placeholder="Description" value={newApproach.description} onChange={(e) => setNewApproach({ ...newApproach, description: e.target.value })} className="w-full mb-4" style={{ minHeight: 40 }} />
            <div className={`${styles.approachFormRow} mb-4`}>
              <input placeholder="T: O(?)" value={newApproach.timeComplexity} onChange={(e) => setNewApproach({ ...newApproach, timeComplexity: e.target.value })} style={{ flex: 1 }} />
              <input placeholder="S: O(?)" value={newApproach.spaceComplexity} onChange={(e) => setNewApproach({ ...newApproach, spaceComplexity: e.target.value })} style={{ flex: 1 }} />
            </div>
            <button className="btn-primary" onClick={addApproach}>save</button>
          </div>
        )}
        {(progress?.approaches || []).map((a, i) => (
          <div key={i} className={styles.approachItem}>
            <div className={styles.approachName}>{a.name}</div>
            {a.description && <div className={styles.approachDesc}>{a.description}</div>}
            <div className={styles.approachMeta}>{a.timeComplexity}{a.spaceComplexity && ` | ${a.spaceComplexity}`}</div>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Review (0=forgot, 5=perfect)</div>
        <div className={styles.reviewRow}>
          {[0,1,2,3,4,5].map((q) => <button key={q} className={styles.reviewBtn} onClick={() => handleReview(q)}>{q}</button>)}
        </div>
        {progress?.nextReview && <div className="fg-faint text-sm mt-8">Next: {progress.nextReview} · {progress.interval}d interval</div>}
      </div>

      <div className={styles.actions}>
        <button className="btn-primary" onClick={markSolved}>mark solved</button>
        <button onClick={() => saveProgress({ status: "review" })}>add to review</button>
        <button onClick={() => saveProgress({ bookmarked: !progress?.bookmarked })}>{progress?.bookmarked ? "★" : "☆"}</button>
        <a href={problem.url} target="_blank" rel="noopener noreferrer" className="btn">leetcode ↗</a>
      </div>
    </div>
  );

  if (mode === "overlay") {
    return (
      <div className={styles.overlay}>
        <div className={styles.backdrop} onClick={onClose} />
        {panel}
      </div>
    );
  }

  return panel;
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

---

## Task 9: QueueList Component

**Files:**
- Create: `src/components/QueueList.tsx` + `QueueList.module.css`

- [ ] **Step 1: Create QueueList.module.css**

```css
.list { }
.item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
.item:hover { background: var(--bg-hover); margin: 0 -10px; padding: 8px 10px; }
.title { flex: 1; font-size: 13px; }
.reason { font-size: 10px; color: var(--fg-faint); padding: 1px 6px; border: 1px solid var(--border); }
.done { opacity: 0.4; text-decoration: line-through; }
.active { color: var(--accent); }
```

- [ ] **Step 2: Create QueueList.tsx**

```typescript
import styles from "./QueueList.module.css";
import { QueuedProblem } from "@/lib/types";

type SessionStatus = "pending" | "active" | "done";

interface Props {
  queue: QueuedProblem[];
  sessionStatus: Record<number, SessionStatus>;
  onSelect: (problemId: number) => void;
}

const reasonLabels: Record<string, string> = {
  review_due: "review due",
  prep_target: "prep target",
  weak_topic: "weak topic",
  sheet_fill: "sheet progress",
};

export default function QueueList({ queue, sessionStatus, onSelect }: Props) {
  return (
    <div className={styles.list}>
      {queue.map((q) => {
        const status = sessionStatus[q.id] || "pending";
        return (
          <div key={q.id} className={`${styles.item} ${status === "done" ? styles.done : ""} ${status === "active" ? styles.active : ""}`} onClick={() => onSelect(q.id)}>
            <span className={`dot ${status === "done" ? "dot-solved" : status === "active" ? "dot-review" : "dot-unsolved"}`} />
            <span className={styles.title}>{q.title}</span>
            <span className={`chip chip-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
            <span className={styles.reason}>{reasonLabels[q.reason]}</span>
          </div>
        );
      })}
      {queue.length === 0 && <div className="fg-faint" style={{ padding: "12px 0" }}>No problems queued. You're all caught up.</div>}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

---

## Task 10: Analytics Components (New)

**Files:**
- Create: `src/components/CompanyCoverage.tsx` + `CompanyCoverage.module.css`
- Create: `src/components/DifficultyTrend.tsx` + `DifficultyTrend.module.css`

- [ ] **Step 1: CompanyCoverage**

`CompanyCoverage.module.css`:
```css
.row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 4px 0; }
.name { flex: 1; }
.bar { width: 80px; height: 4px; background: var(--border); margin: 0 8px; }
.fill { height: 100%; background: var(--fg-dim); }
.pct { font-size: 11px; color: var(--fg-faint); width: 32px; text-align: right; }
```

`CompanyCoverage.tsx`:
```typescript
import styles from "./CompanyCoverage.module.css";
import { EnrichedProblem, ProblemProgress } from "@/lib/types";

interface Props { problems: EnrichedProblem[]; progress: Record<number, ProblemProgress>; company?: string; }

export default function CompanyCoverage({ problems, progress, company }: Props) {
  // When company is provided: show topic breakdown for that company's problems (Analytics "company readiness")
  // When no company: show per-company coverage summary (Overview tab)
  if (company) {
    const companyProblems = problems.filter((p) => p.companies.includes(company));
    const topicMap: Record<string, { total: number; solved: number }> = {};
    for (const prob of companyProblems) {
      for (const topic of prob.topics) {
        if (!topicMap[topic]) topicMap[topic] = { total: 0, solved: 0 };
        topicMap[topic].total++;
        if (progress[prob.id]?.status === "solved") topicMap[topic].solved++;
      }
    }
    const sorted = Object.entries(topicMap).filter(([, v]) => v.total >= 2).sort((a, b) => b[1].total - a[1].total);
    return (
      <div>
        {sorted.map(([name, { total, solved }]) => {
          const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
          return (
            <div key={name} className={styles.row}>
              <span className={styles.name}>{name}</span>
              <div className={styles.bar}><div className={styles.fill} style={{ width: `${pct}%` }} /></div>
              <span className={styles.pct}>{solved}/{total}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: per-company coverage
  const companyMap: Record<string, { total: number; solved: number }> = {};
  for (const prob of problems) {
    for (const c of prob.companies) {
      if (!companyMap[c]) companyMap[c] = { total: 0, solved: 0 };
      companyMap[c].total++;
      if (progress[prob.id]?.status === "solved") companyMap[c].solved++;
    }
  }
  const sorted = Object.entries(companyMap).filter(([, v]) => v.total >= 2).sort((a, b) => b[1].total - a[1].total).slice(0, 8);
  return (
    <div>
      {sorted.map(([name, { total, solved }]) => {
        const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
        return (
          <div key={name} className={styles.row}>
            <span className={styles.name}>{name}</span>
            <div className={styles.bar}><div className={styles.fill} style={{ width: `${pct}%` }} /></div>
            <span className={styles.pct}>{solved}/{total}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: DifficultyTrend**

`DifficultyTrend.module.css`:
```css
.row { display: flex; align-items: center; gap: 12px; padding: 6px 0; font-size: 13px; }
.label { width: 60px; font-weight: 600; }
.value { color: var(--fg-dim); }
```

`DifficultyTrend.tsx`:
```typescript
import styles from "./DifficultyTrend.module.css";
import { EnrichedProblem, ProblemProgress } from "@/lib/types";

interface Props { problems: EnrichedProblem[]; progress: Record<number, ProblemProgress>; }

export default function DifficultyTrend({ problems, progress }: Props) {
  const solved = Object.values(progress).filter((p) => p.status === "solved");
  const avg: Record<string, { total: number; count: number }> = { Easy: { total: 0, count: 0 }, Medium: { total: 0, count: 0 }, Hard: { total: 0, count: 0 } };

  for (const p of solved) {
    const prob = problems.find((pr) => pr.id === p.problemId);
    if (prob && p.timesTaken.length > 0) {
      const a = p.timesTaken.reduce((x, y) => x + y, 0) / p.timesTaken.length;
      avg[prob.difficulty].total += a;
      avg[prob.difficulty].count += 1;
    }
  }

  return (
    <div>
      {(["Easy", "Medium", "Hard"] as const).map((d) => {
        const data = avg[d];
        const val = data.count > 0 ? Math.round(data.total / data.count) : 0;
        const color = d === "Easy" ? "var(--easy)" : d === "Medium" ? "var(--medium)" : "var(--hard)";
        return (
          <div key={d} className={styles.row}>
            <span className={styles.label} style={{ color }}>{d}</span>
            <span className={styles.value}>{val > 0 ? `${val} min avg` : "no data"}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

---

## Task 11: Today Page (Home)

**Files:**
- Rewrite: `src/app/page.tsx`
- Delete: `src/app/Dashboard.module.css`

- [ ] **Step 1: Delete Dashboard.module.css**

```bash
rm src/app/Dashboard.module.css
```

- [ ] **Step 2: Rewrite page.tsx**

```typescript
"use client";
import { useEffect, useState, useCallback } from "react";
import QueueList from "@/components/QueueList";
import WorkspacePanel from "@/components/WorkspacePanel";
import PrepModeBanner from "@/components/PrepModeBanner";
import QuickLogModal from "@/components/QuickLogModal";
import { QueueResponse, QueuedProblem } from "@/lib/types";

type SessionStatus = "pending" | "active" | "done";

export default function TodayPage() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [sessionStatus, setSessionStatus] = useState<Record<number, SessionStatus>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);

  const loadQueue = useCallback(() => {
    fetch("/api/queue").then((r) => r.json()).then(setData);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setSessionStatus((s) => ({ ...s, [id]: s[id] === "done" ? "done" : "active" }));
  };

  const handlePanelClose = () => {
    if (selectedId) {
      setSessionStatus((s) => ({ ...s, [selectedId]: s[selectedId] === "active" ? "pending" : s[selectedId] }));
    }
    setSelectedId(null);
  };

  if (!data) return <div className="fg-faint">loading...</div>;

  const { queue, stats } = data;
  const todayDone = Object.values(sessionStatus).filter((s) => s === "done").length;

  return (
    <div>
      {stats.prepMode && (
        <PrepModeBanner prepMode={stats.prepMode} solved={stats.prepSolved} total={stats.prepTotal} />
      )}

      <div className="flex justify-between items-center mb-16">
        <h1>today</h1>
        <div className="flex gap-16 items-center">
          <span className="fg-dim text-sm">{stats.streak}d streak</span>
          <span className="text-sm">{stats.todaySolved + todayDone}/{stats.adjustedGoal} done</span>
          <span className="fg-dim text-sm">{stats.reviewDue} reviews</span>
        </div>
      </div>

      <h3>queue</h3>
      <QueueList queue={queue} sessionStatus={sessionStatus} onSelect={handleSelect} />

      <div className="flex gap-8 mt-16">
        <button onClick={() => {
          const params = new URLSearchParams();
          fetch(`/api/random?${params}`).then((r) => r.ok ? r.json() : null).then((p) => { if (p) setSelectedId(p.id); });
        }}>random</button>
        <button onClick={() => setShowLog(true)}>log a solve</button>
      </div>

      {selectedId && (
        <WorkspacePanel problemId={selectedId} mode="overlay" onClose={handlePanelClose} />
      )}

      {showLog && (
        <QuickLogModal onClose={() => setShowLog(false)} onSaved={() => { setShowLog(false); loadQueue(); }} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

---

## Task 12: Problems Page (Power Table + Slide-over)

**Files:**
- Rewrite: `src/app/problems/page.tsx` + `Problems.module.css`

- [ ] **Step 1: Rewrite Problems.module.css**

```css
.layout { display: flex; }
.tableArea { flex: 1; overflow: auto; }
.tableAreaCompressed { flex: 1; min-width: 0; overflow: auto; }
.sortable { cursor: pointer; user-select: none; }
.sortable:hover { color: var(--fg); }
.problemLink { color: var(--fg); text-decoration: none; }
.problemLink:hover { text-decoration: underline; }
.cellSmall { font-size: 11px; color: var(--fg-dim); }
.presets { display: flex; gap: 4px; margin-bottom: 8px; }
.preset { font-size: 11px; padding: 2px 8px; }
.presetActive { background: var(--fg); color: var(--bg); border-color: var(--fg); }
.sheetChips { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
.sheetChip { font-size: 11px; padding: 2px 8px; cursor: pointer; border: 1px solid var(--border); background: transparent; font-family: inherit; color: var(--fg-dim); }
.sheetChipActive { color: var(--fg); border-color: var(--fg); }
.inlineAction { opacity: 0; transition: opacity 0.1s; cursor: pointer; background: none; border: none; font-size: 12px; color: var(--fg-dim); font-family: inherit; padding: 2px; }
tr:hover .inlineAction { opacity: 1; }
.diffDots { display: flex; gap: 2px; }
.diffDot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); }
.diffDotFilled { background: var(--fg-dim); }
```

- [ ] **Step 2: Rewrite problems/page.tsx**

This is a large file. Key changes from current:
- Sheet filter as toggleable chips (not dropdown)
- Quick filter presets
- Inline mark-solved checkbox and bookmark on hover
- WorkspacePanel as slide-over on right
- Company column, last solved column, personal difficulty dots

```typescript
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import WorkspacePanel from "@/components/WorkspacePanel";
import PrepModeBanner from "@/components/PrepModeBanner";
import { EnrichedProblem, ProblemProgress, PrepMode } from "@/lib/types";
import styles from "./Problems.module.css";

export default function ProblemsPage() {
  const [problems, setProblems] = useState<EnrichedProblem[]>([]);
  const [progress, setProgress] = useState<Record<number, ProblemProgress>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [sheets, setSheets] = useState<{ id: string; name: string }[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<string>("id");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [settings, setSettings] = useState<{ prepMode?: { active: boolean; company: string; sheet: string; deadline: string } }>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/problems").then((r) => r.json()),
      fetch("/api/progress").then((r) => r.json()),
      fetch("/api/topics").then((r) => r.json()),
      fetch("/api/sheets").then((r) => r.json()),
      fetch("/api/patterns").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([prob, prog, top, sh, pat, set]) => {
      setProblems(prob); setProgress(prog);
      setTopics(top.map((t: { name: string }) => t.name));
      setSheets(sh.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      setPatterns(pat.map((p: { name: string }) => p.name));
      const co = new Set<string>();
      prob.forEach((p: EnrichedProblem) => p.companies?.forEach((c: string) => co.add(c)));
      setCompanies([...co].sort());
      setSettings(set);
    });
  }, []);

  const filtered = problems.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.difficulty && p.difficulty !== filters.difficulty) return false;
    if (filters.topic && !p.topics.includes(filters.topic)) return false;
    if (activeSheet && !p.sheets.includes(activeSheet)) return false;
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
    else if (sortCol === "difficulty") { const o = { Easy: 0, Medium: 1, Hard: 2 }; cmp = o[a.difficulty] - o[b.difficulty]; }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (col: string) => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(true); } };

  const quickSolve = async (id: number) => {
    const today = new Date().toLocaleDateString("en-CA");
    const existing = progress[id];
    await fetch(`/api/progress/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "solved", solveCount: (existing?.solveCount || 0) + 1, lastSolved: today }) });
    const prog = await fetch("/api/progress").then((r) => r.json());
    setProgress(prog);
  };

  const toggleBookmark = async (id: number) => {
    const existing = progress[id];
    await fetch(`/api/progress/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookmarked: !existing?.bookmarked }) });
    const prog = await fetch("/api/progress").then((r) => r.json());
    setProgress(prog);
  };

  const filterConfigs = [
    { name: "difficulty", placeholder: "Difficulty", options: ["Easy", "Medium", "Hard"].map((d) => ({ label: d, value: d })) },
    { name: "topic", placeholder: "Topic", options: topics.map((t) => ({ label: t, value: t })) },
    { name: "pattern", placeholder: "Pattern", options: patterns.map((p) => ({ label: p, value: p })) },
    { name: "company", placeholder: "Company", options: companies.map((c) => ({ label: c, value: c })) },
    { name: "status", placeholder: "Status", options: [{ label: "Solved", value: "solved" }, { label: "Unsolved", value: "unsolved" }, { label: "Review", value: "review" }, { label: "Bookmarked", value: "bookmarked" }] },
  ];

  const prep = settings.prepMode?.active ? settings.prepMode : null;

  return (
    <div>
      {prep && <PrepModeBanner prepMode={prep as PrepMode} solved={problems.filter((p) => p.companies.includes(prep.company) && progress[p.id]?.status === "solved").length} total={problems.filter((p) => p.companies.includes(prep.company)).length} />}
      <div className="flex justify-between items-center mb-12">
        <h1>problems <span className="fg-faint">({sorted.length})</span></h1>
      </div>

      <div className={styles.sheetChips}>
        {sheets.map((s) => (
          <button key={s.id} className={`${styles.sheetChip} ${activeSheet === s.name ? styles.sheetChipActive : ""}`} onClick={() => setActiveSheet(activeSheet === s.name ? "" : s.name)}>
            {s.name}
          </button>
        ))}
      </div>

      <FilterBar filters={filterConfigs} values={filters} onFilter={(name, value) => setFilters((f) => ({ ...f, [name]: value }))} searchValue={search} onSearch={setSearch} />

      <div className={styles.layout}>
        <div className={selectedId ? styles.tableAreaCompressed : styles.tableArea}>
          <table>
            <thead><tr>
              <th style={{ width: 30 }}></th>
              <th className={styles.sortable} style={{ width: 50 }} onClick={() => handleSort("id")}># {sortCol === "id" ? (sortAsc ? "↑" : "↓") : ""}</th>
              <th className={styles.sortable} onClick={() => handleSort("title")}>Title {sortCol === "title" ? (sortAsc ? "↑" : "↓") : ""}</th>
              <th className={styles.sortable} style={{ width: 80 }} onClick={() => handleSort("difficulty")}>Diff</th>
              <th style={{ width: 100 }}>Companies</th>
              <th style={{ width: 70 }}>Last</th>
              <th style={{ width: 50 }}></th>
            </tr></thead>
            <tbody>
              {sorted.map((p) => {
                const prog = progress[p.id];
                const dotClass = prog?.status === "solved" ? "dot-solved" : prog?.status === "review" ? "dot-review" : "dot-unsolved";
                return (
                  <tr key={p.id}>
                    <td><span className={`dot ${dotClass}`} /></td>
                    <td className="fg-faint">{p.id}</td>
                    <td><span className={styles.problemLink} style={{ cursor: "pointer" }} onClick={() => setSelectedId(p.id)}>{p.title}</span></td>
                    <td><span className={`chip chip-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span></td>
                    <td className={styles.cellSmall}>{p.companies.slice(0, 2).join(", ")}</td>
                    <td className={styles.cellSmall}>{prog?.lastSolved || "—"}</td>
                    <td>
                      <button className={styles.inlineAction} onClick={() => quickSolve(p.id)} title="Mark solved">✓</button>
                      <button className={styles.inlineAction} onClick={() => toggleBookmark(p.id)} title="Bookmark">{prog?.bookmarked ? "★" : "☆"}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selectedId && (
          <WorkspacePanel problemId={selectedId} mode="inline" onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

---

## Task 13: Progress Page (3 tabs)

**Files:**
- Create: `src/app/progress/page.tsx` + `Progress.module.css`

- [ ] **Step 1: Create Progress.module.css**

```css
.statRow { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px; }
```

- [ ] **Step 2: Create progress/page.tsx**

```typescript
"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import TabNav from "@/components/TabNav";
import StatCard from "@/components/StatCard";
import ProgressBar from "@/components/ProgressBar";
import Heatmap from "@/components/Heatmap";
import TopicGraph from "@/components/TopicGraph";
import CompanyCoverage from "@/components/CompanyCoverage";
import DifficultyTrend from "@/components/DifficultyTrend";
import ProblemCard from "@/components/ProblemCard";
import { ProblemProgress, EnrichedProblem } from "@/lib/types";
import styles from "./Progress.module.css";

interface SheetStats { name: string; totalProblems: number; solved: number; }
interface TopicStats { id: string; name: string; prerequisites: string[]; totalProblems: number; solved: number; problemIds: number[]; }

export default function ProgressPage() {
  const [tab, setTab] = useState("Overview");
  const [progress, setProgress] = useState<Record<number, ProblemProgress>>({});
  const [problems, setProblems] = useState<EnrichedProblem[]>([]);
  const [sheets, setSheets] = useState<SheetStats[]>([]);
  const [topics, setTopics] = useState<TopicStats[]>([]);
  const [streaks, setStreaks] = useState({ currentStreak: 0, longestStreak: 0, activityLog: {} as Record<string, number> });
  const [settings, setSettings] = useState<{ prepMode?: { active: boolean; company: string; sheet: string; deadline: string } }>({});
  const [reviewDue, setReviewDue] = useState<ProblemProgress[]>([]);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/progress").then((r) => r.json()),
      fetch("/api/problems").then((r) => r.json()),
      fetch("/api/sheets").then((r) => r.json()),
      fetch("/api/topics").then((r) => r.json()),
      fetch("/api/streaks").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/review").then((r) => r.json()),
    ]).then(([prog, prob, sh, top, str, set, rev]) => {
      setProgress(prog); setProblems(prob); setSheets(sh); setTopics(top); setStreaks(str); setSettings(set); setReviewDue(rev);
    });
  }, []);

  const totalSolved = Object.values(progress).filter((p) => p.status === "solved").length;
  const overallPct = problems.length > 0 ? Math.round((totalSolved / problems.length) * 100) : 0;

  // Analytics data
  const solved = Object.values(progress).filter((p) => p.status === "solved");
  const diffData = [
    { name: "Easy", count: solved.filter((p) => problems.find((pr) => pr.id === p.problemId)?.difficulty === "Easy").length, fill: "var(--easy)" },
    { name: "Medium", count: solved.filter((p) => problems.find((pr) => pr.id === p.problemId)?.difficulty === "Medium").length, fill: "var(--medium)" },
    { name: "Hard", count: solved.filter((p) => problems.find((pr) => pr.id === p.problemId)?.difficulty === "Hard").length, fill: "var(--hard)" },
  ];
  const weakTopics = [...topics].sort((a, b) => {
    const ap = a.totalProblems > 0 ? a.solved / a.totalProblems : 0;
    const bp = b.totalProblems > 0 ? b.solved / b.totalProblems : 0;
    return ap - bp;
  }).slice(0, 5);
  const weeklyData: { week: string; count: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const ws = new Date(now); ws.setDate(ws.getDate() - i * 7);
    let count = 0;
    for (let d = 0; d < 7; d++) { const day = new Date(ws); day.setDate(day.getDate() + d); count += streaks.activityLog[day.toLocaleDateString("en-CA")] || 0; }
    weeklyData.push({ week: `W${12 - i}`, count });
  }

  const prep = settings.prepMode?.active ? settings.prepMode : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-12">
        <h1>progress</h1>
      </div>

      <TabNav tabs={["Overview", "Analytics", "Roadmap"]} active={tab} onChange={setTab} />

      {tab === "Overview" && (
        <div>
          <div className={styles.statRow}>
            <StatCard label="solved" value={totalSolved} />
            <StatCard label="streak" value={`${streaks.currentStreak}d`} />
            <StatCard label="progress" value={`${overallPct}%`} />
            <StatCard label="reviews" value={reviewDue.length} />
          </div>

          <h3>activity</h3>
          <Heatmap activityLog={streaks.activityLog} />
          <div className="divider" />

          <h3>sheets</h3>
          {sheets.map((s) => <ProgressBar key={s.name} label={`${s.name} (${s.solved}/${s.totalProblems})`} value={s.solved} max={s.totalProblems} />)}
          <div className="divider" />

          <h3>companies</h3>
          <CompanyCoverage problems={problems} progress={progress} />
        </div>
      )}

      {tab === "Analytics" && (
        <div>
          <div className="grid-2 mb-16">
            <div>
              <h3>difficulty distribution</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={diffData}>
                  <XAxis dataKey="name" stroke="var(--fg-faint)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--fg-faint)" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--bg)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Bar dataKey="count" radius={0}>{diffData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3>avg solve time</h3>
              <DifficultyTrend problems={problems} progress={progress} />
            </div>
          </div>

          <div className="grid-2 mb-16">
            <div>
              <h3>weak topics</h3>
              {weakTopics.map((t) => <ProgressBar key={t.name} label={t.name} value={t.solved} max={t.totalProblems} color="var(--hard)" />)}
            </div>
            <div>
              <h3>weekly trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={weeklyData}>
                  <XAxis dataKey="week" stroke="var(--fg-faint)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--fg-faint)" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--bg)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="var(--fg-dim)" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {prep && (
            <>
              <h3>company readiness — {prep.company}</h3>
              <CompanyCoverage problems={problems} progress={progress} company={prep.company} />
            </>
          )}
        </div>
      )}

      {tab === "Roadmap" && (
        <div>
          <TopicGraph topics={topics} onTopicClick={(id) => setExpandedTopic(expandedTopic === id ? null : id)} />
          {expandedTopic && (() => {
            const topic = topics.find((t) => t.id === expandedTopic);
            if (!topic) return null;
            const topicProblems = problems.filter((p) => topic.problemIds.includes(p.id));
            return (
              <div className="mt-16">
                <h3>{topic.name} — {topic.solved}/{topic.totalProblems}</h3>
                {topicProblems.map((p) => (
                  <ProblemCard key={p.id} id={p.id} title={p.title} difficulty={p.difficulty} status={progress[p.id]?.status} />
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

---

## Task 14: Contests Page (Minor Refresh)

**Files:**
- Rewrite: `src/app/contests/page.tsx` + `Contests.module.css`

- [ ] **Step 1: Rewrite Contests.module.css for raw style**

```css
.formGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.formActions { display: flex; gap: 6px; margin-top: 12px; }
.statCard { text-align: center; padding: 8px 0; }
.statValue { font-size: 20px; font-weight: 700; }
.statLabel { font-size: 11px; color: var(--fg-faint); margin-top: 2px; }
.ratingChange { margin-left: 4px; font-size: 11px; }
.deleteBtn { font-size: 11px; padding: 2px 6px; opacity: 0; }
tr:hover .deleteBtn { opacity: 1; }
```

- [ ] **Step 2: Keep contests/page.tsx as-is** (it was already reformatted with CSS classes by the linter). Only update the stat card inline styles to use the new simpler pattern. The existing file structure is already compatible.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

---

## Task 15: Delete Old Pages & Cleanup

**Files:**
- Delete: `src/app/roadmap/`, `src/app/analytics/`, `src/app/practice/`, `src/app/problems/[id]/`

- [ ] **Step 1: Delete old directories**

```bash
rm -rf src/app/roadmap src/app/analytics src/app/practice "src/app/problems/[id]"
```

- [ ] **Step 2: Create progress directory**

```bash
mkdir -p src/app/progress
```

(The page.tsx was already created in Task 13)

- [ ] **Step 3: Create queue API directory**

```bash
mkdir -p src/app/api/queue
```

(The route.ts was already created in Task 3)

- [ ] **Step 4: Final full build**

Run: `npx next build`
Expected: builds successfully with no TypeScript errors and no missing routes.

- [ ] **Step 5: Manual smoke test**

Start: `npm run dev`
Verify:
1. `/` — Today page loads with queue (may be empty if no progress yet)
2. `/problems` — Table loads, sheet chips work, clicking a title opens slide-over panel
3. `/progress` — All 3 tabs render (Overview, Analytics, Roadmap)
4. `/contests` — Contest page loads with new styling
5. Navbar shows 4 links, prep mode toggle, theme switcher
6. Prep Mode modal opens, can activate/deactivate
7. Theme switching works across all 3 themes

---

## Deferred Items (Not in This Plan)

These spec features are intentionally deferred to a follow-up iteration:

- **Daily goal click-to-edit** on Today page top bar (spec Section 3). Low priority — can use Prep Mode modal or settings for now.
- **Quick filter presets** on Problems page ("Unsolved in Blind 75", "Amazon Easy+Medium", "Review Due"). The sheet chips + dropdowns cover 90% of this. Presets can be added as a polish pass.
- **Keyboard shortcuts** (j/k navigation, Enter to open, Escape to close). Enhancement for power users after core functionality is stable.
- **Streak update deduplication** — streak logic is duplicated in QuickLogModal, WorkspacePanel, and Problems page quickSolve. Should be extracted to a shared utility or moved server-side. quickSolve currently does NOT update streaks — this is a known gap to fix in the follow-up.
