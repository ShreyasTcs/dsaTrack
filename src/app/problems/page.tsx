"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import WorkspacePanel from "@/components/WorkspacePanel";
import PrepModeBanner from "@/components/PrepModeBanner";
import { EnrichedProblem, ProblemProgress, PrepMode } from "@/lib/types";
import styles from "./Problems.module.css";

export default function ProblemsPage() {
  const [problems, setProblems] = useState<EnrichedProblem[]>([]);
  const [progress, setProgress] = useState<Record<number, ProblemProgress>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [sheets, setSheets] = useState<{ id: string; name: string }[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<string>("id");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [settings, setSettings] = useState<{ prepMode?: { active: boolean; company: string; sheet: string; deadline: string } }>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/problems").then((r) => r.json()),
      fetch("/api/progress").then((r) => r.json()),
      fetch("/api/topics").then((r) => r.json()),
      fetch("/api/sheets").then((r) => r.json()),
      fetch("/api/patterns").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([prob, prog, top, sh, pat, set]) => {
      setProblems(prob); setProgress(prog);
      setTopics(top.map((t: { name: string }) => t.name));
      setSheets(sh.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      setPatterns(pat.map((p: { name: string }) => p.name));
      const co = new Set<string>();
      prob.forEach((p: EnrichedProblem) => p.companies?.forEach((c: string) => co.add(c)));
      setCompanies([...co].sort());
      setSettings(set);
    });
  }, []);

  const filtered = problems.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.difficulty && p.difficulty !== filters.difficulty) return false;
    if (filters.topic && !p.topics.includes(filters.topic)) return false;
    if (activeSheet && !p.sheets.includes(activeSheet)) return false;
    if (filters.pattern && !p.patterns.includes(filters.pattern)) return false;
    if (filters.company && !p.companies.includes(filters.company)) return false;
    if (filters.status) {
      const prog = progress[p.id];
      if (filters.status === "unsolved" && prog?.status === "solved") return false;
      if (filters.status === "solved" && prog?.status !== "solved") return false;
      if (filters.status === "review" && prog?.status !== "review") return false;
      if (filters.status === "bookmarked" && !prog?.bookmarked) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === "id") cmp = a.id - b.id;
    else if (sortCol === "title") cmp = a.title.localeCompare(b.title);
    else if (sortCol === "difficulty") { const o = { Easy: 0, Medium: 1, Hard: 2 }; cmp = o[a.difficulty] - o[b.difficulty]; }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (col: string) => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(true); } };

  const quickSolve = async (id: number) => {
    const today = new Date().toLocaleDateString("en-CA");
    const existing = progress[id];
    await fetch(`/api/progress/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "solved", solveCount: (existing?.solveCount || 0) + 1, lastSolved: today }) });
    const prog = await fetch("/api/progress").then((r) => r.json());
    setProgress(prog);
  };

  const toggleBookmark = async (id: number) => {
    const existing = progress[id];
    await fetch(`/api/progress/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookmarked: !existing?.bookmarked }) });
    const prog = await fetch("/api/progress").then((r) => r.json());
    setProgress(prog);
  };

  const filterConfigs = [
    { name: "difficulty", placeholder: "Difficulty", options: ["Easy", "Medium", "Hard"].map((d) => ({ label: d, value: d })) },
    { name: "topic", placeholder: "Topic", options: topics.map((t) => ({ label: t, value: t })) },
    { name: "pattern", placeholder: "Pattern", options: patterns.map((p) => ({ label: p, value: p })) },
    { name: "company", placeholder: "Company", options: companies.map((c) => ({ label: c, value: c })) },
    { name: "status", placeholder: "Status", options: [{ label: "Solved", value: "solved" }, { label: "Unsolved", value: "unsolved" }, { label: "Review", value: "review" }, { label: "Bookmarked", value: "bookmarked" }] },
  ];

  const prep = settings.prepMode?.active ? settings.prepMode : null;

  return (
    <div>
      {prep && <PrepModeBanner prepMode={prep as PrepMode} solved={problems.filter((p) => p.companies.includes(prep.company) && progress[p.id]?.status === "solved").length} total={problems.filter((p) => p.companies.includes(prep.company)).length} />}
      <div className="flex justify-between items-center mb-12">
        <h1>problems <span className="fg-faint">({sorted.length})</span></h1>
      </div>

      <div className={styles.sheetChips}>
        {sheets.map((s) => (
          <button key={s.id} className={`${styles.sheetChip} ${activeSheet === s.name ? styles.sheetChipActive : ""}`} onClick={() => setActiveSheet(activeSheet === s.name ? "" : s.name)}>
            {s.name}
          </button>
        ))}
      </div>

      <FilterBar filters={filterConfigs} values={filters} onFilter={(name, value) => setFilters((f) => ({ ...f, [name]: value }))} searchValue={search} onSearch={setSearch} />

      <div className={styles.layout}>
        <div className={selectedId ? styles.tableAreaCompressed : styles.tableArea}>
          <table>
            <thead><tr>
              <th style={{ width: 30 }}></th>
              <th className={styles.sortable} style={{ width: 50 }} onClick={() => handleSort("id")}># {sortCol === "id" ? (sortAsc ? "↑" : "↓") : ""}</th>
              <th className={styles.sortable} onClick={() => handleSort("title")}>Title {sortCol === "title" ? (sortAsc ? "↑" : "↓") : ""}</th>
              <th className={styles.sortable} style={{ width: 80 }} onClick={() => handleSort("difficulty")}>Diff</th>
              <th style={{ width: 100 }}>Companies</th>
              <th style={{ width: 70 }}>Last</th>
              <th style={{ width: 50 }}></th>
            </tr></thead>
            <tbody>
              {sorted.map((p) => {
                const prog = progress[p.id];
                const dotClass = prog?.status === "solved" ? "dot-solved" : prog?.status === "review" ? "dot-review" : "dot-unsolved";
                return (
                  <tr key={p.id}>
                    <td><span className={`dot ${dotClass}`} /></td>
                    <td className="fg-faint">{p.id}</td>
                    <td><span className={styles.problemLink} style={{ cursor: "pointer" }} onClick={() => setSelectedId(p.id)}>{p.title}</span></td>
                    <td><span className={`chip chip-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span></td>
                    <td className={styles.cellSmall}>{p.companies.slice(0, 2).join(", ")}</td>
                    <td className={styles.cellSmall}>{prog?.lastSolved || "—"}</td>
                    <td>
                      <button className={styles.inlineAction} onClick={() => quickSolve(p.id)} title="Mark solved">✓</button>
                      <button className={styles.inlineAction} onClick={() => toggleBookmark(p.id)} title="Bookmark">{prog?.bookmarked ? "★" : "☆"}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selectedId && (
          <WorkspacePanel problemId={selectedId} mode="inline" onClose={() => setSelectedId(null)} onNavigate={(id) => setSelectedId(id)} />
        )}
      </div>
    </div>
  );
}
