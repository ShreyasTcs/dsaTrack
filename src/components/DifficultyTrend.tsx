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
