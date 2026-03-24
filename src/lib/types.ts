export interface Problem {
  id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  url: string;
  companies: string[];
}

export interface EnrichedProblem extends Problem {
  topics: string[];
  patterns: string[];
  sheets: string[];
}

export interface Approach {
  name: string;
  description: string;
  timeComplexity: string;
  spaceComplexity: string;
  code?: string;
}

export interface ProblemProgress {
  problemId: number;
  status: "unsolved" | "solved" | "review";
  personalDifficulty: number;
  notes: string;
  approaches: Approach[];
  timesTaken: number[];
  bookmarked: boolean;
  solveCount: number;
  lastSolved: string;
  nextReview: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  prerequisites: string[];
  problemIds: number[];
  order: number;
}

export interface Sheet {
  id: string;
  name: string;
  url?: string;
  problemIds: number[];
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  problemIds: number[];
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  activityLog: Record<string, number>;
}

export interface Contest {
  id: string;
  date: string;
  platform: "LeetCode" | "Codeforces" | "CodeChef" | "Other";
  name: string;
  rank: number;
  problemsSolved: number;
  totalProblems: number;
  rating?: number;
  ratingChange?: number;
}

export interface Settings {
  theme: "dark-minimal" | "colorful" | "professional";
  dailyGoal: number;
  prepMode?: PrepMode;
}

export interface PrepMode {
  active: boolean;
  company: string;   // matches Problem.companies[] values e.g. "Amazon"
  sheet: string;      // matches Sheet.id e.g. "blind-75", or "all"
  deadline: string;   // ISO date e.g. "2026-05-01"
}

export interface ProblemFilters {
  topic?: string;
  difficulty?: string;
  sheet?: string;
  pattern?: string;
  company?: string;
  status?: string;
  search?: string;
  bookmarked?: boolean;
}

export interface ExternalProblem {
  title: string;
  platform: string;
  url: string;
  difficulty?: string;
  reason: string;
}

export interface SimilarProblems {
  [problemId: string]: ExternalProblem[];
}

export interface QueuedProblem extends EnrichedProblem {
  reason: "review_due" | "prep_target" | "weak_topic" | "sheet_fill";
}

export interface QueueResponse {
  queue: QueuedProblem[];
  progress: Record<number, ProblemProgress>;
  stats: {
    todaySolved: number;
    dailyGoal: number;
    adjustedGoal: number;
    streak: number;
    reviewDue: number;
    prepMode: PrepMode | null;
    prepSolved: number;
    prepTotal: number;
  };
}
