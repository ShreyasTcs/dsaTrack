import { addDays, today } from "./dates";

export interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReview: string;
}

export interface SM2State {
  interval: number;
  repetitions: number;
  easeFactor: number;
  personalDifficulty?: number;
}

const PERSONAL_DIFF_FACTOR: Record<number, number> = {
  0: 1.0,
  1: 1.3,
  2: 1.1,
  3: 1.0,
  4: 0.75,
  5: 0.6,
};

function applyPersonalDifficulty(interval: number, personalDifficulty: number): number {
  const factor = PERSONAL_DIFF_FACTOR[personalDifficulty] ?? 1.0;
  return Math.max(1, Math.round(interval * factor));
}

export function calculateSM2(
  quality: number,
  repetitions: number,
  interval: number,
  easeFactor: number,
  personalDifficulty: number = 0
): SM2Result {
  let newInterval: number;
  let newRepetitions: number;
  let newEaseFactor: number;

  if (quality >= 3) {
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else newInterval = Math.round(interval * easeFactor);
    newRepetitions = repetitions + 1;
  } else {
    newInterval = 1;
    newRepetitions = 0;
  }

  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  newInterval = applyPersonalDifficulty(newInterval, personalDifficulty);

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    easeFactor: Number(newEaseFactor.toFixed(2)),
    nextReview: addDays(today(), newInterval),
  };
}

export function previewIntervals(state: SM2State): { again: number; hard: number; good: number; easy: number } {
  const pd = state.personalDifficulty ?? 0;
  return {
    again: calculateSM2(1, state.repetitions, state.interval, state.easeFactor, pd).interval,
    hard: calculateSM2(3, state.repetitions, state.interval, state.easeFactor, pd).interval,
    good: calculateSM2(4, state.repetitions, state.interval, state.easeFactor, pd).interval,
    easy: calculateSM2(5, state.repetitions, state.interval, state.easeFactor, pd).interval,
  };
}

export function getDefaultSM2Fields() {
  return {
    nextReview: addDays(today(), 1),
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
  };
}
