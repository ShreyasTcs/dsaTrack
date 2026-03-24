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
