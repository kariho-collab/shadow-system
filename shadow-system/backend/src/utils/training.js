// Jin-Woo's daily set, scaled for a beginner. Targets grow slowly toward the goal.
export const SESSIONS_PER_STEP = 5; // normal-day sessions needed before the target goes up
export const EXERCISES = {
  pushups: { title: 'Push-ups', unit: 'reps', start: 10, step: 5, goal: 100, description: 'Keep your back straight. Drop to your knees if you need to.' },
  situps: { title: 'Sit-ups', unit: 'reps', start: 10, step: 5, goal: 100, description: 'Slow and controlled. Stop if your neck or back hurts.' },
  squats: { title: 'Squats', unit: 'reps', start: 10, step: 5, goal: 100, description: 'Weight on your heels. Go only as deep as feels comfortable.' },
  run: { title: 'Run', unit: 'm', start: 1000, step: 500, goal: 10000, description: 'Walk, jog or run. Walking counts.' },
};
export const targetLabel = (code, v) => (EXERCISES[code].unit === 'm' ? `${v / 1000} km` : `${v} reps`);
/** On recovery and low-energy days the target is halved. */
export function effectiveTarget(code, target, mode) {
  if (mode === 'normal') return target;
  const half = target / 2;
  return EXERCISES[code].unit === 'm' ? Math.max(100, Math.round(half / 100) * 100) : Math.max(1, Math.ceil(half));
}
