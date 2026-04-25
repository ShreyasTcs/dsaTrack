"use client";
import { useEffect, useState } from "react";
import styles from "./QuickLogModal.module.css";
import { putProgress, getProgressById } from "@/lib/storage";
import { recordSolve } from "@/lib/streaks";
import { today, addDays } from "@/lib/dates";

interface Props { onClose: () => void; onSaved: () => void; }

export default function QuickLogModal({ onClose, onSaved }: Props) {
  const [problems, setProblems] = useState<{ id: number; title: string }[]>([]);
  const [problemId, setProblemId] = useState<number | null>(null);
  const [time, setTime] = useState("");

  useEffect(() => {
    fetch("/api/problems").then((r) => r.json()).then((p) => setProblems(p.map((x: { id: number; title: string }) => ({ id: x.id, title: x.title }))));
  }, []);

  const save = () => {
    if (!problemId) return;
    const t = today();
    const existing = getProgressById(problemId);
    const prevInterval = existing?.interval ?? 0;
    const newInterval = Math.max(1, prevInterval || 1);
    putProgress(problemId, {
      status: "solved",
      solveCount: (existing?.solveCount || 0) + 1,
      lastSolved: t,
      nextReview: addDays(t, newInterval),
      interval: newInterval,
      timesTaken: [...(existing?.timesTaken || []), time ? parseInt(time) : undefined].filter(Boolean) as number[],
    });
    recordSolve();
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
