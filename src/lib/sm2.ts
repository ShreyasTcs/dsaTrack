export interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReview: string;
}

export function calculateSM2(
  quality: number,
  repetitions: number,
  interval: number,
  easeFactor: number
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

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    easeFactor: Number(newEaseFactor.toFixed(2)),
    nextReview: nextReview.toISOString().split("T")[0],
  };
}

export function getDefaultSM2Fields() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    nextReview: tomorrow.toISOString().split("T")[0],
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
  };
}
