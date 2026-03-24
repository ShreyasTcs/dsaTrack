"use client";
import { useEffect, useState } from "react";
import styles from "./PrepModeModal.module.css";

interface Props { onClose: () => void; onSave: (active: boolean) => void; }

export default function PrepModeModal({ onClose, onSave }: Props) {
  const [company, setCompany] = useState("");
  const [sheet, setSheet] = useState("all");
  const [deadline, setDeadline] = useState("");
  const [companies, setCompanies] = useState<string[]>([]);
  const [sheets, setSheets] = useState<{ id: string; name: string }[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/problems").then((r) => r.json()),
      fetch("/api/sheets").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([probs, sh, settings]) => {
      const co = new Set<string>();
      probs.forEach((p: { companies: string[] }) => p.companies.forEach((c: string) => co.add(c)));
      setCompanies([...co].sort());
      setSheets(sh.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      if (settings.prepMode) {
        setCompany(settings.prepMode.company || "");
        setSheet(settings.prepMode.sheet || "all");
        setDeadline(settings.prepMode.deadline || "");
        setIsActive(settings.prepMode.active || false);
      }
    });
  }, []);

  const save = async (activate: boolean) => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prepMode: { active: activate, company, sheet, deadline },
      }),
    });
    onSave(activate);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>Prep Mode</div>
        <div className={styles.field}>
          <label>Company</label>
          <select value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">Select...</option>
            {companies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Sheet</label>
          <select value={sheet} onChange={(e) => setSheet(e.target.value)}>
            <option value="all">All sheets</option>
            {sheets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Deadline</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div className={styles.actions}>
          <button className="btn-primary" onClick={() => save(true)} disabled={!company || !deadline}>
            {isActive ? "Update" : "Activate"}
          </button>
          {isActive && <button onClick={() => save(false)}>Deactivate</button>}
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
