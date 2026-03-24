import styles from "./ProgressBar.module.css";
interface Props { label: string; value: number; max: number; color?: string; }
export default function ProgressBar({ label, value, max, color }: Props) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={styles.bar}>
      <div className={styles.header}><span>{label}</span><span className={styles.pct}>{pct}%</span></div>
      <div className={styles.track}><div className={styles.fill} style={{ width: `${pct}%`, background: color || "var(--fg-dim)" }} /></div>
    </div>
  );
}
