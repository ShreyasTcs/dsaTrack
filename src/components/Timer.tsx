"use client";
import { useTimer } from "@/hooks/useTimer";
import styles from "./Timer.module.css";
interface Props { onComplete?: (minutes: number) => void; }
export default function Timer({ onComplete }: Props) {
  const { display, running, start, pause, reset, minutes } = useTimer();
  return (
    <div className={styles.timer}>
      <div className={styles.display}>{display}</div>
      <div className={styles.controls}>
        {!running ? <button onClick={start} className="btn-primary">start</button> : <button onClick={pause}>pause</button>}
        <button onClick={() => { reset(); onComplete?.(minutes); }}>done</button>
      </div>
    </div>
  );
}
