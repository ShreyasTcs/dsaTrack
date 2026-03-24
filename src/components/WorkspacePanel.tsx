"use client";
import { useEffect, useState } from "react";
import Timer from "./Timer";
import styles from "./WorkspacePanel.module.css";
import { EnrichedProblem, ProblemProgress, Approach, ExternalProblem } from "@/lib/types";
import { calculateSM2 } from "@/lib/sm2";

interface Props {
  problemId: number;
  mode: "inline" | "overlay";
  onClose: () => void;
  onNavigate?: (id: number) => void;
}

export default function WorkspacePanel({ problemId, mode, onClose, onNavigate }: Props) {
  const [problem, setProblem] = useState<EnrichedProblem | null>(null);
  const [progress, setProgress] = useState<ProblemProgress | null>(null);
  const [notes, setNotes] = useState("");
  const [personalDiff, setPersonalDiff] = useState(0);
  const [showApproachForm, setShowApproachForm] = useState(false);
  const [newApproach, setNewApproach] = useState<Approach>({ name: "", description: "", timeComplexity: "", spaceComplexity: "" });
  const [externalSimilar, setExternalSimilar] = useState<ExternalProblem[]>([]);

  useEffect(() => {
    fetch(`/api/problems/${problemId}`).then((r) => r.json()).then(setProblem);
    fetch(`/api/progress/${problemId}`).then((r) => { if (r.ok) return r.json(); return null; }).then((p) => {
      if (p) { setProgress(p); setNotes(p.notes || ""); setPersonalDiff(p.personalDifficulty || 0); }
    });
    fetch(`/api/similar/${problemId}`).then((r) => r.json()).then(setExternalSimilar).catch(() => setExternalSimilar([]));
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

      {externalSimilar.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Practice Similar</div>
          {externalSimilar.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className={styles.similarItem}>
              <span className={styles.similarPlatform}>{s.platform}</span>
              <span className={styles.similarTitle}>{s.title}</span>
              {s.difficulty && <span className={styles.similarDiff}>{s.difficulty}</span>}
              <span className={styles.similarReason}>{s.reason}</span>
            </a>
          ))}
        </div>
      )}

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
