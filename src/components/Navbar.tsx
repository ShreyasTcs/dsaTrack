"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import ThemeSwitcher from "./ThemeSwitcher";
import PrepModeModal from "./PrepModeModal";
import styles from "./Navbar.module.css";
import { getSettings, getProgress } from "@/lib/storage";
import { today } from "@/lib/dates";
import { recomputeStreak } from "@/lib/streaks";
import { useAuth } from "@/context/AuthContext";

const links = [
  { href: "/", label: "Today" },
  { href: "/review", label: "Review" },
  { href: "/problems", label: "Problems" },
  { href: "/progress", label: "Progress" },
  { href: "/contests", label: "Contests" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [prepActive, setPrepActive] = useState(false);
  const [reviewsDue, setReviewsDue] = useState(0);

  useEffect(() => {
    recomputeStreak();
    const s = getSettings();
    setPrepActive(!!s.prepMode?.active);
    const t = today();
    const prog = getProgress();
    const due = Object.values(prog).filter(
      (p) => (p.status === "solved" || p.status === "review") && !!p.nextReview && p.nextReview <= t
    ).length;
    setReviewsDue(due);
  }, [pathname]);

  return (
    <>
      <nav style={{ borderBottom: "1px solid var(--border)" }}>
        <div className={styles.nav}>
          <Link href="/" className={styles.logo}>DSA</Link>
          <div className={styles.links}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={`${styles.link} ${pathname === l.href ? styles.active : ""}`}>
                {l.label}
                {l.href === "/review" && reviewsDue > 0 && <span className={styles.linkBadge} title={`${reviewsDue} due`} />}
              </Link>
            ))}
          </div>
          <div className={styles.right}>
            <button
              className={`${styles.prepToggle} ${prepActive ? styles.prepActive : ""}`}
              onClick={() => setShowPrepModal(true)}
            >
              {prepActive ? "● prep" : "prep"}
            </button>
            <ThemeSwitcher />
            <button onClick={logout} className={styles.prepToggle}>logout</button>
          </div>
        </div>
      </nav>
      {showPrepModal && (
        <PrepModeModal
          onClose={() => setShowPrepModal(false)}
          onSave={(active) => { setPrepActive(active); setShowPrepModal(false); }}
        />
      )}
    </>
  );
}
