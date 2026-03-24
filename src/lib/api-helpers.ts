import { EnrichedProblem, ProblemFilters, ProblemProgress } from "./types";

export function filterProblems(
  problems: EnrichedProblem[],
  progress: Record<number, ProblemProgress>,
  filters: ProblemFilters
): EnrichedProblem[] {
  let result = problems;

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((p) => p.title.toLowerCase().includes(q));
  }
  if (filters.difficulty) result = result.filter((p) => p.difficulty === filters.difficulty);
  if (filters.topic) result = result.filter((p) => p.topics.includes(filters.topic!));
  if (filters.sheet) result = result.filter((p) => p.sheets.includes(filters.sheet!));
  if (filters.pattern) result = result.filter((p) => p.patterns.includes(filters.pattern!));
  if (filters.company) result = result.filter((p) => p.companies.includes(filters.company!));
  if (filters.status) {
    result = result.filter((p) => {
      const prog = progress[p.id];
      if (filters.status === "unsolved") return !prog || prog.status === "unsolved";
      if (filters.status === "solved") return prog?.status === "solved";
      if (filters.status === "review") return prog?.status === "review";
      return true;
    });
  }
  if (filters.bookmarked === true) result = result.filter((p) => progress[p.id]?.bookmarked);

  return result;
}
