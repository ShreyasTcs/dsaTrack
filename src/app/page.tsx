"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import QueueList from "@/components/QueueList";
import WorkspacePanel from "@/components/WorkspacePanel";
import PrepModeBanner from "@/components/PrepModeBanner";
import QuickLogModal from "@/components/QuickLogModal";
import { enrichProblems } from "@/lib/enrichProblems";
import { generateQueue } from "@/lib/queue";
import { filterProblems } from "@/lib/api-helpers";
import { getProgress, getStreaks, getSettings, putSettings } from "@/lib/storage";
import { today as todayStr } from "@/lib/dates";
import { QueueResponse, EnrichedProblem, Topic, Sheet, Pattern } from "@/lib/types";

type SessionStatus = "pending" | "active" | "done";

export default function TodayPage() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [sessionStatus, setSessionStatus] = useState<Record<number, SessionStatus>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [staticData, setStaticData] = useState<{ problems: EnrichedProblem[]; topics: Topic[]; sheets: Sheet[]; patterns: Pattern[] } | null>(null);

  const loadQueue = useCallback((enriched?: EnrichedProblem[], tops?: Topic[], shs?: Sheet[]) => {
    const progress = getProgress();
    const settings = getSettings();
    const streaks = getStreaks();
    const today = todayStr();

    // Need static data
    if (!enriched && !staticData) return;
    const problems = enriched || staticData!.problems;
    const topics = tops || staticData!.topics;
    const sheets = shs || staticData!.sheets;

    // Auto-deactivate Prep Mode if deadline passed or all done
    if (settings.prepMode?.active) {
      const deadline = new Date(settings.prepMode.deadline);
      const now = new Date(today);
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        settings.prepMode.active = false;
        putSettings(settings);
      } else {
        const raw = problems as EnrichedProblem[];
        const targetSheet = settings.prepMode.sheet === "all"
          ? null
          : sheets.find((s) => s.id === settings.prepMode!.sheet);
        const targetIds = targetSheet ? targetSheet.problemIds : raw.map((p) => p.id);
        const matching = targetIds.filter((id) => {
          const prob = raw.find((p) => p.id === id);
          return prob && prob.companies.includes(settings.prepMode!.company);
        });
        const allSolved = matching.every((id) => progress[id]?.status === "solved");
        if (allSolved && matching.length > 0) {
          settings.prepMode.active = false;
          putSettings(settings);
        }
      }
    }

    const { queue, adjustedGoal, reviewDueCount, ratio } = generateQueue({
      problems, progress, topics, sheets, settings,
    });

    const queueProgress: Record<number, (typeof progress)[number]> = {};
    for (const q of queue) {
      if (progress[q.id]) queueProgress[q.id] = progress[q.id];
    }

    const todaySolved = streaks.activityLog[today] || 0;

    let prepSolved = 0;
    let prepTotal = 0;
    if (settings.prepMode?.active) {
      const targetSheet = settings.prepMode.sheet === "all"
        ? null
        : sheets.find((s) => s.id === settings.prepMode!.sheet);
      const targetIds = targetSheet ? targetSheet.problemIds : problems.map((p) => p.id);
      const matching = problems.filter(
        (p) => targetIds.includes(p.id) && p.companies.includes(settings.prepMode!.company)
      );
      prepTotal = matching.length;
      prepSolved = matching.filter((p) => progress[p.id]?.status === "solved").length;
    }

    setData({
      queue,
      progress: queueProgress,
      stats: {
        todaySolved,
        dailyGoal: settings.dailyGoal,
        adjustedGoal,
        streak: streaks.currentStreak,
        reviewDue: reviewDueCount,
        prepMode: settings.prepMode?.active ? settings.prepMode : null,
        prepSolved,
        prepTotal,
        ratio,
      },
    });
  }, [staticData]);

  useEffect(() => {
    Promise.all([
      fetch("/api/problems").then((r) => r.json()),
      fetch("/api/topics").then((r) => r.json()),
      fetch("/api/sheets").then((r) => r.json()),
      fetch("/api/patterns").then((r) => r.json()),
    ]).then(([probs, tops, shs, pats]) => {
      const enriched = enrichProblems(probs, tops, shs, pats);
      setStaticData({ problems: enriched, topics: tops, sheets: shs, patterns: pats });
      loadQueue(enriched, tops, shs);
    });
  }, []);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setSessionStatus((s) => ({ ...s, [id]: s[id] === "done" ? "done" : "active" }));
  };

  const handlePanelClose = () => {
    if (selectedId) {
      setSessionStatus((s) => ({ ...s, [selectedId]: s[selectedId] === "active" ? "pending" : s[selectedId] }));
    }
    setSelectedId(null);
    loadQueue();
  };

  if (!data) return <div className="fg-faint">loading...</div>;

  const { queue, stats } = data;
  const todayDone = Object.values(sessionStatus).filter((s) => s === "done").length;

  const updateGoal = (n: number) => {
    if (!Number.isFinite(n) || n < 1) return;
    putSettings({ dailyGoal: n });
    loadQueue();
  };

  return (
    <div>
      {stats.prepMode && (
        <PrepModeBanner prepMode={stats.prepMode} solved={stats.prepSolved} total={stats.prepTotal} />
      )}

      <div className="flex justify-between items-center mb-8">
        <h1>today</h1>
        <div className="flex gap-16 items-center">
          <span className="fg-dim text-sm">{stats.streak}d streak</span>
          <span className="text-sm">{stats.todaySolved + todayDone}/{stats.adjustedGoal} done</span>
          <Link href="/review" className="fg-dim text-sm">{stats.reviewDue} reviews</Link>
        </div>
      </div>

      <div className="flex gap-12 items-center mb-16 fg-dim text-sm">
        <label className="flex gap-6 items-center">
          goal
          <input
            type="number"
            min={1}
            value={stats.dailyGoal}
            onChange={(e) => updateGoal(parseInt(e.target.value, 10))}
            style={{ width: 56 }}
          />
        </label>
        <span>= {stats.ratio.easy} easy · {stats.ratio.medium} medium · {stats.ratio.hard} hard</span>
        {stats.adjustedGoal !== stats.dailyGoal && (
          <span className="fg-faint">(prep bumped to {stats.adjustedGoal})</span>
        )}
      </div>

      <h3>queue</h3>
      <QueueList queue={queue} sessionStatus={sessionStatus} onSelect={handleSelect} />

      <div className="flex gap-8 mt-16">
        <button onClick={() => {
          if (!staticData) return;
          const progress = getProgress();
          const filtered = filterProblems(staticData.problems, progress, { status: "unsolved" });
          if (filtered.length > 0) {
            setSelectedId(filtered[Math.floor(Math.random() * filtered.length)].id);
          }
        }}>random unsolved</button>
        <button onClick={() => setShowLog(true)}>log a solve</button>
        {stats.reviewDue > 0 && (
          <Link href="/review" className="btn-primary" style={{ textDecoration: "none" }}>
            start review ({stats.reviewDue})
          </Link>
        )}
      </div>

      {selectedId && (
        <WorkspacePanel problemId={selectedId} mode="overlay" onClose={handlePanelClose} ids={queue.map((q) => q.id)} onNavigate={(id) => setSelectedId(id)} onSolved={(id) => {
          setSessionStatus((s) => ({ ...s, [id]: "done" }));
          loadQueue();
        }} />
      )}

      {showLog && (
        <QuickLogModal onClose={() => setShowLog(false)} onSaved={() => { setShowLog(false); loadQueue(); }} />
      )}
    </div>
  );
}
