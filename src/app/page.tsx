"use client";
import { useEffect, useState, useCallback } from "react";
import QueueList from "@/components/QueueList";
import WorkspacePanel from "@/components/WorkspacePanel";
import PrepModeBanner from "@/components/PrepModeBanner";
import QuickLogModal from "@/components/QuickLogModal";
import { QueueResponse, QueuedProblem } from "@/lib/types";

type SessionStatus = "pending" | "active" | "done";

export default function TodayPage() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [sessionStatus, setSessionStatus] = useState<Record<number, SessionStatus>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);

  const loadQueue = useCallback(() => {
    fetch("/api/queue").then((r) => r.json()).then(setData);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setSessionStatus((s) => ({ ...s, [id]: s[id] === "done" ? "done" : "active" }));
  };

  const handlePanelClose = () => {
    if (selectedId) {
      setSessionStatus((s) => ({ ...s, [selectedId]: s[selectedId] === "active" ? "pending" : s[selectedId] }));
    }
    setSelectedId(null);
  };

  if (!data) return <div className="fg-faint">loading...</div>;

  const { queue, stats } = data;
  const todayDone = Object.values(sessionStatus).filter((s) => s === "done").length;

  return (
    <div>
      {stats.prepMode && (
        <PrepModeBanner prepMode={stats.prepMode} solved={stats.prepSolved} total={stats.prepTotal} />
      )}

      <div className="flex justify-between items-center mb-16">
        <h1>today</h1>
        <div className="flex gap-16 items-center">
          <span className="fg-dim text-sm">{stats.streak}d streak</span>
          <span className="text-sm">{stats.todaySolved + todayDone}/{stats.adjustedGoal} done</span>
          <span className="fg-dim text-sm">{stats.reviewDue} reviews</span>
        </div>
      </div>

      <h3>queue</h3>
      <QueueList queue={queue} sessionStatus={sessionStatus} onSelect={handleSelect} />

      <div className="flex gap-8 mt-16">
        <button onClick={() => {
          const params = new URLSearchParams();
          fetch(`/api/random?${params}`).then((r) => r.ok ? r.json() : null).then((p) => { if (p) setSelectedId(p.id); });
        }}>random</button>
        <button onClick={() => setShowLog(true)}>log a solve</button>
      </div>

      {selectedId && (
        <WorkspacePanel problemId={selectedId} mode="overlay" onClose={handlePanelClose} onNavigate={(id) => setSelectedId(id)} />
      )}

      {showLog && (
        <QuickLogModal onClose={() => setShowLog(false)} onSaved={() => { setShowLog(false); loadQueue(); }} />
      )}
    </div>
  );
}
