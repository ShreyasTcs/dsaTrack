import styles from "./StatCard.module.css";
interface Props { label: string; value: string | number; color?: string; }
export default function StatCard({ label, value, color }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.value} style={color ? { color } : undefined}>{value}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
