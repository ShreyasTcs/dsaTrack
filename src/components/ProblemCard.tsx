import styles from "./ProblemCard.module.css";
interface Props { id: number; title: string; difficulty: "Easy" | "Medium" | "Hard"; topics?: string[]; status?: string; reason?: string; onClick?: () => void; }
export default function ProblemCard({ id, title, difficulty, topics, status, reason, onClick }: Props) {
  const dotClass = status === "solved" ? "dot-solved" : status === "review" ? "dot-review" : "dot-unsolved";
  return (
    <div className={styles.card} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <div className={styles.header}>
        <span className={`dot ${dotClass}`} />
        <span className={styles.title}>{title}</span>
        <span className={`chip chip-${difficulty.toLowerCase()}`}>{difficulty}</span>
      </div>
      {(reason || (topics && topics.length > 0)) && (
        <div className={styles.tags}>
          {reason && <span className={styles.reason}>{reason}</span>}
          {topics?.slice(0, 2).map((t) => <span key={t} className="chip chip-topic">{t}</span>)}
        </div>
      )}
    </div>
  );
}
