import styles from "./QueueList.module.css";
import { QueuedProblem } from "@/lib/types";

type SessionStatus = "pending" | "active" | "done";

interface Props {
  queue: QueuedProblem[];
  sessionStatus: Record<number, SessionStatus>;
  onSelect: (problemId: number) => void;
}

const reasonLabels: Record<string, string> = {
  review_due: "review due",
  prep_target: "prep target",
  weak_topic: "weak topic",
  sheet_fill: "sheet progress",
};

export default function QueueList({ queue, sessionStatus, onSelect }: Props) {
  return (
    <div className={styles.list}>
      {queue.map((q) => {
        const status = sessionStatus[q.id] || "pending";
        return (
          <div key={q.id} className={`${styles.item} ${status === "done" ? styles.done : ""} ${status === "active" ? styles.active : ""}`} onClick={() => onSelect(q.id)}>
            <span className={`dot ${status === "done" ? "dot-solved" : status === "active" ? "dot-review" : "dot-unsolved"}`} />
            <span className={styles.title}>{q.title}</span>
            <span className={`chip chip-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
            <span className={styles.reason}>{reasonLabels[q.reason]}</span>
          </div>
        );
      })}
      {queue.length === 0 && <div className="fg-faint" style={{ padding: "12px 0" }}>No problems queued. You're all caught up.</div>}
    </div>
  );
}
