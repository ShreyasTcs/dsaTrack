"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import ThemeSwitcher from "./ThemeSwitcher";
import PrepModeModal from "./PrepModeModal";
import styles from "./Navbar.module.css";
import { getSettings } from "@/lib/storage";

const links = [
  { href: "/", label: "Today" },
  { href: "/problems", label: "Problems" },
  { href: "/progress", label: "Progress" },
  { href: "/contests", label: "Contests" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [prepActive, setPrepActive] = useState(false);

  useEffect(() => {
    const s = getSettings();
    setPrepActive(!!s.prepMode?.active);
  }, []);

  return (
    <>
      <nav style={{ borderBottom: "1px solid var(--border)" }}>
        <div className={styles.nav}>
          <Link href="/" className={styles.logo}>dsa</Link>
          <div className={styles.links}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={`${styles.link} ${pathname === l.href ? styles.active : ""}`}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className={styles.right}>
            <button
              className={`${styles.prepToggle} ${prepActive ? styles.prepActive : ""}`}
              onClick={() => setShowPrepModal(true)}
            >
              {prepActive ? "\u25CF prep" : "prep"}
            </button>
            <ThemeSwitcher />
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
