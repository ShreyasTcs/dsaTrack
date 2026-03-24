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
