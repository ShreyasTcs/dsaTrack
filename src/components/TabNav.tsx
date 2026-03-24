import styles from "./TabNav.module.css";
interface Props { tabs: string[]; active: string; onChange: (tab: string) => void; }
export default function TabNav({ tabs, active, onChange }: Props) {
  return (
    <div className={styles.tabs}>
      {tabs.map((t) => (
        <button key={t} className={`${styles.tab} ${active === t ? styles.active : ""}`} onClick={() => onChange(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}
