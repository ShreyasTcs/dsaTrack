"use client";
import { useTheme } from "@/context/ThemeContext";
import styles from "./ThemeSwitcher.module.css";

const themes = [
  { value: "dark-minimal" as const, label: "dark" },
  { value: "colorful" as const, label: "color" },
  { value: "professional" as const, label: "light" },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <div className={styles.switcher}>
      {themes.map((t) => (
        <button key={t.value} className={`${styles.btn} ${theme === t.value ? styles.active : ""}`} onClick={() => setTheme(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
