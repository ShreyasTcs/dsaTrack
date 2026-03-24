# DSA Tracker Redesign — Design Spec

**Date**: 2026-03-24
**Status**: Approved
**Scope**: Full UI + logic overhaul of DSA Tracker app

---

## 1. Goals

- Consolidate 7 pages into 4 (Today, Problems, Progress, Contests)
- Add study plan engine with auto-generated daily queue
- Add Prep Mode for company/sheet/deadline targeting
- Add company-specific prep, difficulty trend tracking
- Raw minimalist UI: monochrome, dense, no decoration

## 2. Page Structure

| Page | URL | Purpose |
|------|-----|---------|
| Today | `/` | Daily queue: reviews + recommended problems, timer, quick-log |
| Problems | `/problems` | Power table + workspace slide-over panel |
| Progress | `/progress` | 3 tabs: Overview, Analytics, Roadmap |
| Contests | `/contests` | Contest logging (minor refresh only) |

### Removed/merged pages:
- `/roadmap` → tab inside Progress
- `/analytics` → tab inside Progress
- `/practice` → absorbed into Today
- `/problems/[id]` → slide-over panel on Problems page (and Today page)

### Navbar:
- 4 links: Today, Problems, Progress, Contests
- Prep Mode toggle (right side)
- Theme switcher (kept, moved to subtle position)

## 3. Today Page (`/`)

### Top bar (single row):
- Streak: number with label
- Today's progress: `3/5 problems` with thin progress bar
- Daily goal (click to edit)
- If Prep Mode active: "Prepping for Amazon | Blind 75 | 23 days left"

### Main section — Today's Queue:
Ordered list of problem cards. Each card shows:
- Problem title, difficulty indicator (colored dot), topic/pattern tags
- Reason label: "Review due", "Blind 75 gap", "Weak: Trees", "Company: Amazon"
- Session status (UI-only, not persisted): pending / active / done
  - "pending": default state (not yet attempted today)
  - "active": timer is running for this problem (only 1 at a time)
  - "done": marked solved or review submitted during this session
  - These are ephemeral React state, NOT changes to ProblemProgress.status
- Click opens workspace slide-over panel

### Queue generation algorithm (priority order):
1. Overdue SM-2 reviews (nextReview <= today)
2. Problems from active prep plan (if Prep Mode on)
3. Weak topic recommendations (lowest completion % topics, pick unsolved)
4. Fill to daily goal from most-progressed sheet

### Bottom — Quick actions:
- "Random Problem" button with filter dropdowns (difficulty + topic only — keep it simple)
- "Log a Solve" shortcut: modal to pick problem from dropdown, set status, add time

## 4. Problems Page (`/problems`)

### Layout: 70% table / 30% slide-over panel

### Left — Power Table:
Columns: Status (dot), #, Title, Difficulty, Companies (top 2 chips), Sheets (icon badges), Last Solved, Personal Difficulty (dots)

Filters:
- Search input
- Company filter (prominent position)
- Sheet filter as toggleable chips above table (not dropdown)
- Quick presets: "Unsolved in Blind 75", "Amazon Easy+Medium", "Review Due"
- Difficulty, topic, pattern, status dropdowns

Inline actions (on hover):
- Checkbox to mark solved
- Bookmark toggle

### Right — Workspace Slide-over Panel:
Opens when clicking a problem title. Table compresses to ~55%.

Contents:
- Problem title, difficulty, tags, LeetCode link
- Timer (start/pause/done)
- Notes textarea (auto-save on blur)
- Personal difficulty (1-5)
- Approaches section (add/view)
- SM-2 review buttons (0-5)
- Mark Solved / Add to Review
- Stats: solve count, last solved, time history
- Close button returns to full-width table

Panel also opens from Today page as a right-side overlay with a semi-transparent backdrop (clicking backdrop closes it). Same component, two modes: `inline` (compresses sibling content on Problems page) and `overlay` (floats above content on Today page). Mode passed as a prop.

### Prep Mode banner (when active):
Top bar: "Prepping for **Amazon** | **Blind 75** | 23 days left | 42/75 solved" with progress bar.

## 5. Progress Page (`/progress`)

### Tab 1 — Overview (default):
- Stat row: Problems Solved, Streak, Overall %, Review Queue size
- Activity heatmap (6 months)
- Sheet completion progress bars
- Company coverage: top 5-6 companies with % of their problems solved

### Tab 2 — Analytics:
- Difficulty distribution bar chart
- **Difficulty trend chart (NEW)**: Current average solve time per difficulty (Easy/Medium/Hard) shown as a grouped bar chart. Note: `timesTaken` has no per-entry timestamps (only `lastSolved` date exists), so a true weekly trend is not possible without a data model change. Display current averages only. Future enhancement: add `solveHistory: { date, time }[]` to enable time-series.
- Weekly solve volume chart
- Weak topics list
- **Company readiness (NEW)**: If Prep Mode active, shows a table of topics that the target company's problems fall into, with solved/total counts per topic. Only shows topics where the company has 2+ problems (avoids noise). Not a radar chart — just a simple progress-bar table matching the raw aesthetic.

### Tab 3 — Roadmap:
- TopicGraph DAG visualization (existing)
- Click topic → inline problem list expands below graph (no navigation away)
- Solved/total per topic

## 6. Study Plan Engine

### Default mode:
Computed server-side at `/api/queue`. Returns ordered EnrichedProblem[] with `reason` field.

Algorithm:
1. Overdue SM-2 reviews (nextReview <= today) → priority 1
2. Weakest 3 topics → 1 unsolved from each → priority 2
   - "Weakest" = lowest completion percentage (solved / totalProblems)
   - Tie-break: prefer topic with more total problems (larger gap to fill)
   - Skip topics at 100% or topics with 0 unsolved problems remaining
   - If fewer than 3 qualifying topics, use however many exist
3. Fill from most-progressed sheet to hit daily goal → priority 3
   - "Most-progressed" = highest completion percentage among sheets
   - Pick unsolved problems from that sheet, sorted Easy → Medium → Hard
4. Cap at dailyGoal + all overdue reviews (reviews always shown even if over goal)

### Prep Mode:
Activated via navbar toggle. Modal collects:
- Target company (dropdown)
- Target sheet (dropdown or "All")
- Deadline (date picker)

Stored in settings.json:
```json
{
  "theme": "dark-minimal",
  "dailyGoal": 3,
  "prepMode": {
    "active": true,
    "company": "Amazon",
    "sheet": "blind-75",
    "deadline": "2026-05-01"
  }
}
```

When active:
- Queue prioritizes unsolved problems matching company + sheet (Easy → Medium → Hard)
- Daily goal auto-adjusts: `ceil(remaining / daysLeft)`. Edge cases:
  - `daysLeft === 0` (deadline is today): show all remaining problems, label "Deadline today!"
  - `daysLeft < 0` (past deadline): auto-deactivate Prep Mode, show toast "Prep deadline passed — Prep Mode deactivated"
  - `remaining === 0`: show "All problems complete!" and auto-deactivate
- Prep banner on Today and Problems pages
- Company readiness table on Analytics tab
- Deactivate anytime via navbar toggle (reverts to default mode)

## 7. New API Route

### `GET /api/queue`
Computes today's problem queue server-side.

Response:
```typescript
{
  queue: QueuedProblem[];
  progress: Record<number, ProblemProgress>;  // keyed by problemId, only for queued problems
  stats: {
    todaySolved: number;
    dailyGoal: number;
    adjustedGoal: number;  // may differ from dailyGoal if Prep Mode is active
    streak: number;
    reviewDue: number;
    prepMode: PrepMode | null;
  };
}
```

Each problem in queue:
```typescript
interface QueuedProblem extends EnrichedProblem {
  reason: "review_due" | "prep_target" | "weak_topic" | "sheet_fill";
}
```

Progress is returned alongside queue so the Today page can show solve count, notes preview, and last-solved without a second fetch.

## 8. Data Model Changes

### Settings type update:
```typescript
export interface PrepMode {
  active: boolean;
  company: string;   // matches Problem.companies[] values e.g. "Amazon"
  sheet: string;      // matches Sheet.id e.g. "blind-75", or "all"
  deadline: string;   // ISO date e.g. "2026-05-01"
}

export interface Settings {
  theme: "dark-minimal" | "colorful" | "professional";
  dailyGoal: number;
  prepMode?: PrepMode;
}
```

### New type:
```typescript
export interface QueuedProblem extends EnrichedProblem {
  reason: "review_due" | "prep_target" | "weak_topic" | "sheet_fill";
}
```

No other data model changes. All new features computed from existing data.

**Note on session state**: The Today page tracks "pending / active / done" per queue item as React state only. These are NOT persisted to ProblemProgress. "active" means the timer is running. "done" means the user clicked Mark Solved or submitted a review in the current browser session. Refreshing the page recomputes the queue fresh.

## 9. UI Design System

### Philosophy: Raw minimalist. Tool built by an engineer for themselves.

### Color palette:
- Near-monochrome: backgrounds, text, borders all shades of gray
- Color ONLY for data meaning:
  - Easy: muted green
  - Medium: muted yellow/amber
  - Hard: muted red
  - Solved: green dot
  - Review: amber dot
  - Unsolved: gray dot
- Single subtle accent for interactive elements (muted blue or just white)
- Everything else: grayscale

### Surfaces:
- No box-shadows anywhere
- No rounded cards (border-radius: 2-4px max, or 0)
- Sections separated by whitespace and 1px dividers
- Flat, no elevation hierarchy

### Typography:
- Monospace or semi-mono font for the whole app (e.g., JetBrains Mono, IBM Plex Mono, or system monospace)
- 13px body text, tight line-height (1.4)
- Minimal padding throughout
- Information-dense layout

### Status indicators:
- No emojis. Small filled/empty/half circles or text labels
- Solved: `●` (green), Review: `◐` (amber), Unsolved: `○` (gray)

### Interactions:
- No hover lift, no shadows, no glow
- Hover: subtle text color change or underline
- Buttons: text-like with subtle border. Primary action: filled bg. Everything else: ghost
- Slide-over panel: 200ms slide from right
- Tab switches: instant (no animation)
- Queue items: subtle opacity transition on completion

### Themes:
- Dark-minimal: primary theme, redesigned for monochrome raw feel
- Colorful and professional: tightened to match new dense layout
- Dark is the star

## 10. Components Changed/New

### Changed:
- **Navbar**: 4 links, prep mode toggle, denser
- **StatCard**: Simpler, no borders/shadows, just number + label
- **ProgressBar**: Thinner, no rounded ends, monochrome track
- **Heatmap**: Denser cells, monochrome green scale only
- **FilterBar**: Sheet chips instead of dropdown, company filter prominent
- **ProblemCard**: Denser, dot status instead of emoji, reason label added
- **Timer**: Minimal, monospace digits, no decorative wrapper
- **TopicGraph**: Sharper nodes, no colored backgrounds, just border indicators
- **ThemeSwitcher**: Smaller, text-based instead of emoji buttons

### New:
- **WorkspacePanel**: Slide-over panel component (replaces full page workspace)
- **QueueList**: Today's queue with reason labels and session status
- **PrepModeBanner**: Compact bar showing prep target/deadline/progress
- **PrepModeModal**: Setup form for company/sheet/deadline
- **TabNav**: Simple tab component for Progress page
- **QuickLogModal**: Modal to quickly log a solve from Today page
- **CompanyCoverage**: Bar chart/progress bars for company readiness
- **DifficultyTrend**: Line chart for solve time trends

### Removed:
- No standalone pages for roadmap, analytics, practice
- No separate problem workspace page

## 11. Files Affected

### Delete:
- `src/app/roadmap/` (entire directory)
- `src/app/analytics/` (entire directory)
- `src/app/practice/` (entire directory)
- `src/app/problems/[id]/` (entire directory)
- `src/app/Dashboard.module.css` (if it exists; verify before deleting)

### Create:
- `src/app/progress/page.tsx` + `Progress.module.css`
- `src/app/api/queue/route.ts`
- `src/components/WorkspacePanel.tsx` + `.module.css`
- `src/components/QueueList.tsx` + `.module.css`
- `src/components/PrepModeBanner.tsx` + `.module.css`
- `src/components/PrepModeModal.tsx` + `.module.css`
- `src/components/TabNav.tsx` + `.module.css`
- `src/components/QuickLogModal.tsx` + `.module.css`
- `src/components/CompanyCoverage.tsx` + `.module.css`
- `src/components/DifficultyTrend.tsx` + `.module.css`

### Rewrite:
- `src/app/globals.css` (full redesign for raw minimalist)
- `src/app/layout.tsx` (new nav structure)
- `src/app/page.tsx` (Today page replaces Dashboard)
- `src/app/problems/page.tsx` (add slide-over, new filters)
- `src/app/contests/page.tsx` (minor style refresh)
- `src/lib/types.ts` (add PrepMode, QueuedProblem)
- `src/app/api/settings/route.ts` (handle prepMode field)
- All component `.tsx` and `.module.css` files (style overhaul)

### Unchanged:
- `src/lib/data.ts` (file I/O layer)
- `src/lib/sm2.ts` (algorithm)
- `src/lib/enrichProblems.ts` (enrichment logic)
- `src/lib/api-helpers.ts` (filtering)
- `src/hooks/useTimer.ts` (timer hook)
- `src/context/ThemeContext.tsx` (theme context)
- All `data/*.json` files (no schema changes except settings.json gaining prepMode)
- Most API routes (problems, progress, review, topics, sheets, patterns, random, streaks, contests, export, import)
