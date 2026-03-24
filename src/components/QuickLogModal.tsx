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
