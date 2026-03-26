"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import WorkspacePanel from "@/components/WorkspacePanel";
import PrepModeBanner from "@/components/PrepModeBanner";
import { EnrichedProblem, ProblemProgress, PrepMode } from "@/lib/types";
import { getProgress, putProgress, getSettings } from "@/lib/storage";
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
      fetch("/api/topics").then((r) => r.json()),
      fetch("/api/sheets").then((r) => r.json()),
      fetch("/api/patterns").then((r) => r.json()),
    ]).then(([prob, top, sh, pat]) => {
      setProblems(prob);
      setTopics(top.map((t: { name: string }) => t.name));
      setSheets(sh.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      setPatterns(pat.map((p: { name: string }) => p.name));
      const co = new Set<string>();
      prob.forEach((p: EnrichedProblem) => p.companies?.forEach((c: string) => co.add(c)));
      setCompanies([...co].sort());
    });
    setProgress(getProgress());
    setSettings(getSettings());
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

  const quickSolve = (id: number) => {
    const today = new Date().toLocaleDateString("en-CA");
    const existing = progress[id];
    putProgress(id, { status: "solved", solveCount: (existing?.solveCount || 0) + 1, lastSolved: today });
    setProgress(getProgress());
  };

  const toggleBookmark = (id: number) => {
    const existing = progress[id];
    putProgress(id, { bookmarked: !existing?.bookmarked });
    setProgress(getProgress());
  };

  const filterConfigs = [
    { name: "difficulty", placeholder: "Difficulty", options: ["Easy", "Medium", "Hard"].map((d) => ({ label: d, value: d })) },
    { name: "topic", placeholder: "Topic", options: topics.map((t) => ({ label: t, value: t })) },
    { name: "pattern", placeholder: "Pattern", options: patterns.map((p) => ({ label: p, value: p })) },
    { name: "company", placeholder: "Company", options: companies.map((c) => ({ label: c, value: c })) },
    { name: "status", placeholder: "Status", options: [{ label: "Solved", value: "solved" }, { label: "Unsolved", value: "unsolved" }, { label: "Review", value: "review" }, { label: "Bookmarked", value: "bookmarked" }] },
  ];

  return (
    <div>
      {settings.prepMode?.active && (
        <PrepModeBanner
          prepMode={settings.prepMode as import("@/lib/types").PrepMode}
          solved={problems.filter((p) => p.companies.includes(settings.prepMode!.company) && progress[p.id]?.status === "solved").length}
          total={problems.filter((p) => p.companies.includes(settings.prepMode!.company)).length}
        />
      )}

      <div className="flex justify-between items-center mb-16">
        <h1>problems</h1>
        <span className="fg-dim text-sm">{filtered.length} shown</span>
      </div>

      <div className="mb-16">
        <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full mb-8" />
        <FilterBar filters={filterConfigs} values={filters} onFilter={(name, value) => setFilters((f) => ({ ...f, [name]: value }))} />
        <div className="flex gap-4 mt-8 flex-wrap">
          <button className={`chip ${!activeSheet ? "chip-active" : ""}`} onClick={() => setActiveSheet("")}>All</button>
          {sheets.map((s) => (
            <button key={s.id} className={`chip ${activeSheet === s.name ? "chip-active" : ""}`} onClick={() => setActiveSheet(activeSheet === s.name ? "" : s.name)}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort("id")} style={{ cursor: "pointer" }}>#</th>
            <th onClick={() => handleSort("title")} style={{ cursor: "pointer" }}>Title</th>
            <th onClick={() => handleSort("difficulty")} style={{ cursor: "pointer" }}>Diff</th>
            <th>Topics</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const prog = progress[p.id];
            return (
              <tr key={p.id} className={styles.row} onClick={() => setSelectedId(p.id)}>
                <td className="fg-dim">{p.id}</td>
                <td>
                  <span className={prog?.status === "solved" ? styles.solved : prog?.status === "review" ? styles.review : ""}>
                    {p.title}
                  </span>
                </td>
                <td><span className={`chip chip-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span></td>
                <td className="fg-dim text-sm">{p.topics.slice(0, 2).join(", ")}</td>
                <td className={styles.actions} onClick={(e) => e.stopPropagation()}>
                  <button className={styles.actionBtn} onClick={() => quickSolve(p.id)} title="Quick solve">✓</button>
                  <button className={styles.actionBtn} onClick={() => toggleBookmark(p.id)} title="Bookmark">{prog?.bookmarked ? "★" : "☆"}</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedId && (
        <WorkspacePanel problemId={selectedId} mode="overlay" onClose={() => { setSelectedId(null); setProgress(getProgress()); }} />
      )}
    </div>
  );
}
