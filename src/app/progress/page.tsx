"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import TabNav from "@/components/TabNav";
import StatCard from "@/components/StatCard";
import ProgressBar from "@/components/ProgressBar";
import Heatmap from "@/components/Heatmap";
import TopicGraph from "@/components/TopicGraph";
import CompanyCoverage from "@/components/CompanyCoverage";
import DifficultyTrend from "@/components/DifficultyTrend";
import ProblemCard from "@/components/ProblemCard";
import { ProblemProgress, EnrichedProblem } from "@/lib/types";
import styles from "./Progress.module.css";

interface SheetStats { name: string; totalProblems: number; solved: number; }
interface TopicStats { id: string; name: string; prerequisites: string[]; totalProblems: number; solved: number; problemIds: number[]; }

export default function ProgressPage() {
  const [tab, setTab] = useState("Overview");
  const [progress, setProgress] = useState<Record<number, ProblemProgress>>({});
  const [problems, setProblems] = useState<EnrichedProblem[]>([]);
  const [sheets, setSheets] = useState<SheetStats[]>([]);
  const [topics, setTopics] = useState<TopicStats[]>([]);
  const [streaks, setStreaks] = useState({ currentStreak: 0, longestStreak: 0, activityLog: {} as Record<string, number> });
  const [settings, setSettings] = useState<{ prepMode?: { active: boolean; company: string; sheet: string; deadline: string } }>({});
  const [reviewDue, setReviewDue] = useState<ProblemProgress[]>([]);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/progress").then((r) => r.json()),
      fetch("/api/problems").then((r) => r.json()),
      fetch("/api/sheets").then((r) => r.json()),
      fetch("/api/topics").then((r) => r.json()),
      fetch("/api/streaks").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/review").then((r) => r.json()),
    ]).then(([prog, prob, sh, top, str, set, rev]) => {
      setProgress(prog); setProblems(prob); setSheets(sh); setTopics(top); setStreaks(str); setSettings(set); setReviewDue(rev);
    });
  }, []);

  const totalSolved = Object.values(progress).filter((p) => p.status === "solved").length;
  const overallPct = problems.length > 0 ? Math.round((totalSolved / problems.length) * 100) : 0;

  // Analytics data
  const solved = Object.values(progress).filter((p) => p.status === "solved");
  const diffData = [
    { name: "Easy", count: solved.filter((p) => problems.find((pr) => pr.id === p.problemId)?.difficulty === "Easy").length, fill: "var(--easy)" },
    { name: "Medium", count: solved.filter((p) => problems.find((pr) => pr.id === p.problemId)?.difficulty === "Medium").length, fill: "var(--medium)" },
    { name: "Hard", count: solved.filter((p) => problems.find((pr) => pr.id === p.problemId)?.difficulty === "Hard").length, fill: "var(--hard)" },
  ];
  const weakTopics = [...topics].sort((a, b) => {
    const ap = a.totalProblems > 0 ? a.solved / a.totalProblems : 0;
    const bp = b.totalProblems > 0 ? b.solved / b.totalProblems : 0;
    return ap - bp;
  }).slice(0, 5);
  const weeklyData: { week: string; count: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const ws = new Date(now); ws.setDate(ws.getDate() - i * 7);
    let count = 0;
    for (let d = 0; d < 7; d++) { const day = new Date(ws); day.setDate(day.getDate() + d); count += streaks.activityLog[day.toLocaleDateString("en-CA")] || 0; }
    weeklyData.push({ week: `W${12 - i}`, count });
  }

  const prep = settings.prepMode?.active ? settings.prepMode : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-12">
        <h1>progress</h1>
      </div>

      <TabNav tabs={["Overview", "Analytics", "Roadmap"]} active={tab} onChange={setTab} />

      {tab === "Overview" && (
        <div>
          <div className={styles.statRow}>
            <StatCard label="solved" value={totalSolved} />
            <StatCard label="streak" value={`${streaks.currentStreak}d`} />
            <StatCard label="progress" value={`${overallPct}%`} />
            <StatCard label="reviews" value={reviewDue.length} />
          </div>

          <h3>activity</h3>
          <Heatmap activityLog={streaks.activityLog} />
          <div className="divider" />

          <h3>sheets</h3>
          {sheets.map((s) => <ProgressBar key={s.name} label={`${s.name} (${s.solved}/${s.totalProblems})`} value={s.solved} max={s.totalProblems} />)}
          <div className="divider" />

          <h3>companies</h3>
          <CompanyCoverage problems={problems} progress={progress} />
        </div>
      )}

      {tab === "Analytics" && (
        <div>
          <div className="grid-2 mb-16">
            <div>
              <h3>difficulty distribution</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={diffData}>
                  <XAxis dataKey="name" stroke="var(--fg-faint)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--fg-faint)" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--bg)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Bar dataKey="count" radius={0}>{diffData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3>avg solve time</h3>
              <DifficultyTrend problems={problems} progress={progress} />
            </div>
          </div>

          <div className="grid-2 mb-16">
            <div>
              <h3>weak topics</h3>
              {weakTopics.map((t) => <ProgressBar key={t.name} label={t.name} value={t.solved} max={t.totalProblems} color="var(--hard)" />)}
            </div>
            <div>
              <h3>weekly trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={weeklyData}>
                  <XAxis dataKey="week" stroke="var(--fg-faint)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--fg-faint)" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--bg)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="var(--fg-dim)" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {prep && (
            <>
              <h3>company readiness — {prep.company}</h3>
              <CompanyCoverage problems={problems} progress={progress} company={prep.company} />
            </>
          )}
        </div>
      )}

      {tab === "Roadmap" && (
        <div>
          <TopicGraph topics={topics} onTopicClick={(id) => setExpandedTopic(expandedTopic === id ? null : id)} />
          {expandedTopic && (() => {
            const topic = topics.find((t) => t.id === expandedTopic);
            if (!topic) return null;
            const topicProblems = problems.filter((p) => topic.problemIds.includes(p.id));
            return (
              <div className="mt-16">
                <h3>{topic.name} — {topic.solved}/{topic.totalProblems}</h3>
                {topicProblems.map((p) => (
                  <ProblemCard key={p.id} id={p.id} title={p.title} difficulty={p.difficulty} status={progress[p.id]?.status} />
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
