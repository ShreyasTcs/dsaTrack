"use client";
import styles from "./TopicGraph.module.css";
interface TopicNode { id: string; name: string; prerequisites: string[]; totalProblems: number; solved: number; }
interface Props { topics: TopicNode[]; onTopicClick: (id: string) => void; }
export default function TopicGraph({ topics, onTopicClick }: Props) {
  const getStatus = (t: TopicNode) => {
    if (t.solved === t.totalProblems && t.totalProblems > 0) return "complete";
    if (t.solved > 0) return "inProgress";
    const prereqsMet = t.prerequisites.every((preId) => {
      const pre = topics.find((tp) => tp.id === preId);
      return pre && pre.solved === pre.totalProblems && pre.totalProblems > 0;
    });
    return prereqsMet || t.prerequisites.length === 0 ? "available" : "locked";
  };
  const getTier = (topicId: string, visited = new Set<string>()): number => {
    if (visited.has(topicId)) return 0;
    visited.add(topicId);
    const topic = topics.find((t) => t.id === topicId);
    if (!topic || topic.prerequisites.length === 0) return 0;
    return 1 + Math.max(...topic.prerequisites.map((p) => getTier(p, visited)));
  };
  const tiers: Map<number, TopicNode[]> = new Map();
  for (const t of topics) {
    const tier = getTier(t.id);
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(t);
  }
  const sortedTiers = [...tiers.entries()].sort((a, b) => a[0] - b[0]);
  const statusLabels: Record<string, string> = { complete: "done", inProgress: "started", available: "ready", locked: "locked" };
  return (
    <div className={styles.graph}>
      {sortedTiers.map(([tier, tierTopics]) => (
        <div key={tier} className={styles.tier}>
          {tierTopics.map((t) => {
            const status = getStatus(t);
            return (
              <button key={t.id} className={`${styles.node} ${styles[status]}`} onClick={() => onTopicClick(t.id)}>
                <div className={styles.name}>{t.name}</div>
                <div className={styles.stats}>{t.solved}/{t.totalProblems}</div>
                <div className={styles.statusLabel}>{statusLabels[status]}</div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
