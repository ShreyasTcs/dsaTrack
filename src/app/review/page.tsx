"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./Review.module.css";
import ReviewSession from "./ReviewSession";
import { EnrichedProblem, ProblemProgress, Problem, Topic, Sheet, Pattern } from "@/lib/types";
import { enrichProblems } from "@/lib/enrichProblems";
import { getProgress, getSettings, putSettings } from "@/lib/storage";
import { today, daysBetween } from "@/lib/dates";

interface DueItem {
  problem: EnrichedProblem;
  progress: ProblemProgress;
  daysOverdue: number;
}

export default function ReviewPage() {
  const [problems, setProblems] = useState<EnrichedProblem[]>([]);
  const [progress, setProgress] = useState<Record<number, ProblemProgress>>({});
  const [reviewCap, setReviewCap] = useState(20);
  const [sessionIds, setSessionIds] = useState<number[] | null>(null);

  const reload = () => {
    setProgress(getProgress());
    setReviewCap(getSettings().reviewCap ?? 20);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/problems").then((r) => r.json()),
      fetch("/api/topics").then((r) => r.json()),
      fetch("/api/sheets").then((r) => r.json()),
      fetch("/api/patterns").then((r) => r.json()),
    ]).then(([probs, tops, shs, pats]: [Problem[], Topic[], Sheet[], Pattern[]]) => {
      setProblems(enrichProblems(probs, tops, shs, pats));
      reload();
    });
  }, []);

  const t = today();

  const { overdue, dueToday, upcoming } = useMemo(() => {
    const overdue: DueItem[] = [];
    const dueToday: DueItem[] = [];
    const upcoming: DueItem[] = [];

    for (const p of Object.values(progress)) {
      if ((p.status !== "solved" && p.status !== "review") || !p.nextReview) continue;
      const prob = problems.find((x) => x.id === p.problemId);
      if (!prob) continue;
      const diff = daysBetween(t, p.nextReview);
      const item: DueItem = { problem: prob, progress: p, daysOverdue: -diff };
      if (diff < 0) overdue.push(item);
      else if (diff === 0) dueToday.push(item);
      else if (diff <= 7) upcoming.push(item);
    }
    overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
    dueToday.sort((a, b) => a.problem.title.localeCompare(b.problem.title));
    upcoming.sort((a, b) => a.progress.nextReview.localeCompare(b.progress.nextReview));
    return { overdue, dueToday, upcoming };
  }, [progress, problems, t]);

  const dueNow = [...overdue, ...dueToday];
  const totalDue = dueNow.length;
  const inCap = dueNow.slice(0, reviewCap);
  const beyondCap = dueNow.slice(reviewCap);

  const updateCap = (n: number) => {
    if (!Number.isFinite(n) || n < 1) return;
    putSettings({ reviewCap: n });
    setReviewCap(n);
  };

  const startSession = (ids: number[]) => {
    if (ids.length === 0) return;
    setSessionIds(ids);
  };

  const closeSession = () => {
    setSessionIds(null);
    reload();
  };

  return (
    <div>
      <div className={styles.headerRow}>
        <h1>review</h1>
        <div className="flex gap-12 items-center">
          <span className="fg-dim text-sm">{totalDue} due</span>
          <label className={styles.cap}>
            cap
            <input
              type="number"
              min={1}
              value={reviewCap}
              onChange={(e) => updateCap(parseInt(e.target.value, 10))}
            />
          </label>
          <button
            className={`btn-primary ${styles.startBtn}`}
            disabled={inCap.length === 0}
            onClick={() => startSession(inCap.map((i) => i.problem.id))}
          >
            start session ({inCap.length})
          </button>
        </div>
      </div>

      <Section
        title="overdue"
        items={overdue}
        rowClass=""
        onRowClick={(id) => startSession([id])}
        emptyText="Nothing overdue."
      />
      <Section
        title="due today"
        items={dueToday}
        rowClass=""
        onRowClick={(id) => startSession([id])}
        emptyText="No reviews due today."
      />

      {beyondCap.length > 0 && (
        <Section
          title={`extra (beyond cap of ${reviewCap})`}
          items={beyondCap.map((b) => ({ ...b }))}
          rowClass={styles.rowExtra}
          onRowClick={(id) => startSession([id])}
          emptyText=""
        />
      )}

      <Section
        title="upcoming (next 7 days)"
        items={upcoming}
        rowClass=""
        onRowClick={(id) => startSession([id])}
        emptyText="Nothing scheduled in the next week."
      />

      {sessionIds && (
        <ReviewSession
          ids={sessionIds}
          problems={problems}
          onClose={closeSession}
        />
      )}
    </div>
  );
}

function Section({
  title,
  items,
  rowClass,
  onRowClick,
  emptyText,
}: {
  title: string;
  items: DueItem[];
  rowClass: string;
  onRowClick: (id: number) => void;
  emptyText: string;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{title}</span>
        <span className={styles.sectionCount}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        emptyText && <div className={styles.empty}>{emptyText}</div>
      ) : (
        items.map((it) => (
          <div
            key={it.problem.id}
            className={`${styles.row} ${rowClass}`}
            onClick={() => onRowClick(it.problem.id)}
          >
            <span className={`chip chip-${it.problem.difficulty.toLowerCase()}`}>
              {it.problem.difficulty[0]}
            </span>
            <span className={styles.rowTitle}>{it.problem.title}</span>
            <span className={styles.rowMeta}>
              {it.daysOverdue > 0
                ? `${it.daysOverdue}d overdue`
                : it.daysOverdue === 0
                ? "due today"
                : `in ${-it.daysOverdue}d`}
              {" · "}
              {it.progress.interval || 1}d
            </span>
          </div>
        ))
      )}
    </div>
  );
}
