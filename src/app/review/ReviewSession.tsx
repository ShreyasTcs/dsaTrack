"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./Review.module.css";
import { EnrichedProblem, ProblemProgress } from "@/lib/types";
import { calculateSM2, previewIntervals, getDefaultSM2Fields } from "@/lib/sm2";
import { getProgressById, putProgress } from "@/lib/storage";

interface Props {
  ids: number[];
  problems: EnrichedProblem[];
  onClose: () => void;
}

type Quality = 1 | 3 | 4 | 5;

export default function ReviewSession({ ids, problems, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [progress, setProgress] = useState<ProblemProgress | null>(null);
  const [personalDiff, setPersonalDiff] = useState(0);

  const id = ids[idx];
  const problem = useMemo(() => problems.find((p) => p.id === id), [id, problems]);

  useEffect(() => {
    if (id == null) return;
    const p = getProgressById(id);
    setProgress(p);
    setPersonalDiff(p?.personalDifficulty || 0);
    setRevealed(false);
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " && !revealed) {
        e.preventDefault();
        setRevealed(true);
      }
      if (revealed) {
        if (e.key === "1") grade(1);
        if (e.key === "2") grade(3);
        if (e.key === "3") grade(4);
        if (e.key === "4") grade(5);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, idx, personalDiff, progress]);

  const setDifficulty = (d: number) => {
    if (!problem) return;
    setPersonalDiff(d);
    putProgress(problem.id, { personalDifficulty: d });
    setProgress((prev) => (prev ? { ...prev, personalDifficulty: d } : prev));
  };

  const grade = (quality: Quality) => {
    if (!problem) return;
    const base = progress ?? { ...getDefaultSM2Fields(), personalDifficulty: personalDiff };
    const result = calculateSM2(
      quality,
      base.repetitions ?? 0,
      base.interval ?? 0,
      base.easeFactor ?? 2.5,
      personalDiff
    );
    putProgress(problem.id, {
      ...result,
      personalDifficulty: personalDiff,
      status: quality >= 3 ? "solved" : "review",
    });
    if (idx + 1 >= ids.length) {
      onClose();
    } else {
      setIdx(idx + 1);
    }
  };

  const skip = () => {
    if (idx + 1 >= ids.length) onClose();
    else setIdx(idx + 1);
  };

  if (!problem) {
    return (
      <div className={styles.sessionOverlay}>
        <div className={styles.sessionDone}>
          <div className={styles.sessionDoneTitle}>session complete</div>
          <button className="btn" onClick={onClose}>close</button>
        </div>
      </div>
    );
  }

  const previewState = {
    interval: progress?.interval ?? 0,
    repetitions: progress?.repetitions ?? 0,
    easeFactor: progress?.easeFactor ?? 2.5,
    personalDifficulty: personalDiff,
  };
  const intervals = previewIntervals(previewState);

  return (
    <div className={styles.sessionOverlay}>
      <div className={styles.sessionHeader}>
        <span className={styles.sessionProgress}>
          {idx + 1} / {ids.length}
        </span>
        <div className="flex gap-8 items-center">
          <button className={styles.skipBtn} onClick={skip}>skip →</button>
          <button className={styles.sessionClose} onClick={onClose}>×</button>
        </div>
      </div>

      <div className={styles.sessionBody}>
        <div className={styles.sessionTitle}>{problem.title}</div>
        <div className={styles.sessionChips}>
          <span className={`chip chip-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
          {problem.topics.map((t) => <span key={t} className="chip chip-topic">{t}</span>)}
          {problem.patterns.map((p) => <span key={p} className="chip chip-pattern">{p}</span>)}
        </div>

        <div className={styles.sessionMeta}>
          <span>last solved: {progress?.lastSolved || "never"}</span>
          <span>interval: {progress?.interval ?? 0}d</span>
          <span>solves: {progress?.solveCount ?? 0}</span>
          <a href={problem.url} target="_blank" rel="noopener noreferrer">leetcode ↗</a>
        </div>

        <div className={styles.sessionPrompt}>How hard is this problem (overall)?</div>
        <div className={styles.diffRow}>
          {[1, 2, 3, 4, 5].map((d) => (
            <button
              key={d}
              className={`${styles.diffBtn} ${d <= personalDiff ? styles.diffBtnActive : ""}`}
              onClick={() => setDifficulty(d)}
            >
              {d}
            </button>
          ))}
        </div>

        {!revealed ? (
          <button className={styles.revealBtn} onClick={() => setRevealed(true)}>
            reveal notes &amp; approaches (space)
          </button>
        ) : (
          <>
            {progress?.notes && (
              <div className={styles.revealedBlock}>
                <div className={styles.revealedTitle}>notes</div>
                <div className={styles.revealedText}>{progress.notes}</div>
              </div>
            )}
            {progress?.approaches && progress.approaches.length > 0 && (
              <div className={styles.revealedBlock}>
                <div className={styles.revealedTitle}>approaches</div>
                {progress.approaches.map((a, i) => (
                  <div key={i} className={styles.approachItem}>
                    <div className={styles.approachName}>{a.name}</div>
                    {a.description && <div className={styles.approachDesc}>{a.description}</div>}
                    <div className={styles.approachMeta}>
                      {a.timeComplexity}{a.spaceComplexity && ` | ${a.spaceComplexity}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!progress?.notes && (!progress?.approaches || progress.approaches.length === 0) && (
              <div className={styles.revealedBlock}>
                <div className={styles.revealedText} style={{ color: "var(--fg-faint)" }}>
                  No notes or approaches yet — open the problem from the list to add some.
                </div>
              </div>
            )}

            <div className={styles.sessionPrompt}>How well did you recall it?</div>
            <div className={styles.gradeRow}>
              <button className={`${styles.gradeBtn} ${styles.gradeAgain}`} onClick={() => grade(1)}>
                <span className={styles.gradeLabel}>Again</span>
                <span className={styles.gradeInterval}>{intervals.again}d</span>
              </button>
              <button className={`${styles.gradeBtn} ${styles.gradeHard}`} onClick={() => grade(3)}>
                <span className={styles.gradeLabel}>Hard</span>
                <span className={styles.gradeInterval}>{intervals.hard}d</span>
              </button>
              <button className={`${styles.gradeBtn} ${styles.gradeGood}`} onClick={() => grade(4)}>
                <span className={styles.gradeLabel}>Good</span>
                <span className={styles.gradeInterval}>{intervals.good}d</span>
              </button>
              <button className={`${styles.gradeBtn} ${styles.gradeEasy}`} onClick={() => grade(5)}>
                <span className={styles.gradeLabel}>Easy</span>
                <span className={styles.gradeInterval}>{intervals.easy}d</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
