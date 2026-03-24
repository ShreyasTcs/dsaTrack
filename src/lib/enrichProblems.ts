import { Problem, EnrichedProblem, Topic, Sheet, Pattern } from "./types";

export function enrichProblems(
  problems: Problem[],
  topics: Topic[],
  sheets: Sheet[],
  patterns: Pattern[]
): EnrichedProblem[] {
  const topicMap = new Map<number, string[]>();
  for (const t of topics) {
    for (const pid of t.problemIds) {
      if (!topicMap.has(pid)) topicMap.set(pid, []);
      topicMap.get(pid)!.push(t.name);
    }
  }

  const sheetMap = new Map<number, string[]>();
  for (const s of sheets) {
    for (const pid of s.problemIds) {
      if (!sheetMap.has(pid)) sheetMap.set(pid, []);
      sheetMap.get(pid)!.push(s.name);
    }
  }

  const patternMap = new Map<number, string[]>();
  for (const p of patterns) {
    for (const pid of p.problemIds) {
      if (!patternMap.has(pid)) patternMap.set(pid, []);
      patternMap.get(pid)!.push(p.name);
    }
  }

  return problems.map((prob) => ({
    ...prob,
    topics: topicMap.get(prob.id) || [],
    sheets: sheetMap.get(prob.id) || [],
    patterns: patternMap.get(prob.id) || [],
  }));
}
