"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Contest } from "@/lib/types";
import styles from "./Contests.module.css";

const emptyContest: {
  date: string; platform: Contest["platform"]; name: string;
  rank: number; problemsSolved: number; totalProblems: number;
  rating: number | undefined; ratingChange: number | undefined;
} = { date: "", platform: "LeetCode", name: "", rank: 0, problemsSolved: 0, totalProblems: 0, rating: undefined, ratingChange: undefined };

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyContest);

  useEffect(() => { fetch("/api/contests").then((r) => r.json()).then(setContests); }, []);

  const addContest = async () => {
    const res = await fetch("/api/contests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const created = await res.json();
    setContests([created, ...contests]); setForm(emptyContest); setShowForm(false);
  };

  const deleteContest = async (id: string) => {
    await fetch(`/api/contests/${id}`, { method: "DELETE" });
    setContests(contests.filter((c) => c.id !== id));
  };

  const ratingData = contests.filter((c) => c.rating).reverse().map((c) => ({ date: c.date, rating: c.rating }));
  const avgRank = contests.length > 0 ? Math.round(contests.reduce((a, c) => a + c.rank, 0) / contests.length) : 0;
  const bestRank = contests.length > 0 ? Math.min(...contests.map((c) => c.rank)) : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-16">
        <h1>Contests</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Log Contest</button>
      </div>

      {showForm && (
        <div className="mb-24" style={{ padding: "12px", border: "1px solid var(--border)" }}>
          <h3>Log New Contest</h3>
          <div className={styles.formGrid}>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as Contest["platform"] })}>
              <option>LeetCode</option><option>Codeforces</option><option>CodeChef</option><option>Other</option>
            </select>
            <input placeholder="Contest name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input type="number" placeholder="Rank" value={form.rank || ""} onChange={(e) => setForm({ ...form, rank: parseInt(e.target.value) || 0 })} />
            <input type="number" placeholder="Problems solved" value={form.problemsSolved || ""} onChange={(e) => setForm({ ...form, problemsSolved: parseInt(e.target.value) || 0 })} />
            <input type="number" placeholder="Total problems" value={form.totalProblems || ""} onChange={(e) => setForm({ ...form, totalProblems: parseInt(e.target.value) || 0 })} />
            <input type="number" placeholder="Rating (optional)" value={form.rating || ""} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) || undefined })} />
            <input type="number" placeholder="Rating change (optional)" value={form.ratingChange || ""} onChange={(e) => setForm({ ...form, ratingChange: parseInt(e.target.value) || undefined })} />
          </div>
          <div className={styles.formActions}>
            <button className="btn-primary" onClick={addContest}>Save Contest</button>
            <button onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="grid-3 mb-24">
        <div className={styles.statCard}>
          <div className={styles.statValue}>{contests.length}</div>
          <div className={styles.statLabel}>Total Contests</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: "var(--solved)" }}>{bestRank || "\u2014"}</div>
          <div className={styles.statLabel}>Best Rank</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: "var(--medium)" }}>{avgRank || "\u2014"}</div>
          <div className={styles.statLabel}>Avg Rank</div>
        </div>
      </div>

      {ratingData.length > 0 && (
        <div className="mb-24" style={{ padding: "12px", border: "1px solid var(--border)" }}>
          <h3>Rating Progression</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={ratingData}>
              <XAxis dataKey="date" stroke="var(--fg-dim)" />
              <YAxis stroke="var(--fg-dim)" />
              <Tooltip contentStyle={{ background: "var(--bg-alt)", border: "1px solid var(--border)" }} />
              <Line type="monotone" dataKey="rating" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <h3>Contest History</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Platform</th><th>Contest</th><th>Rank</th><th>Solved</th><th>Rating</th><th></th>
            </tr>
          </thead>
          <tbody>
            {contests.map((c) => (
              <tr key={c.id}>
                <td>{c.date}</td>
                <td>{c.platform}</td>
                <td>{c.name}</td>
                <td>{c.rank.toLocaleString()}</td>
                <td>{c.problemsSolved}/{c.totalProblems}</td>
                <td>
                  {c.rating || "\u2014"}
                  {c.ratingChange && (
                    <span
                      className={styles.ratingChange}
                      style={{ color: c.ratingChange > 0 ? "var(--solved)" : "var(--hard)" }}
                    >
                      {c.ratingChange > 0 ? "\u2191" : "\u2193"}{Math.abs(c.ratingChange)}
                    </span>
                  )}
                </td>
                <td>
                  <button className={styles.deleteBtn} onClick={() => deleteContest(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
