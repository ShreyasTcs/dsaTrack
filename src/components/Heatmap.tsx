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
