export const CATEGORIES = ['BODY', 'ACADEMY', 'CYBER FORGE', 'QUANT LAB', 'WEALTH', 'INNER KINGDOM'];
export const DIFFICULTIES = ['easy', 'normal', 'hard', 'elite'];
export const DIFFICULTY_XP = { easy: 10, normal: 25, hard: 50, elite: 100 };
export const MODES = ['normal', 'recovery', 'low_energy'];
export const ATTRIBUTE_MAP = {
  BODY: ['Strength', 'Endurance'],
  ACADEMY: ['Knowledge'],
  'CYBER FORGE': ['Technical Skills'],
  'QUANT LAB': ['Intelligence'],
  WEALTH: ['Discipline'],
  'INNER KINGDOM': ['Discipline'],
};
const RANKS = [[1, 'E'], [5, 'D'], [10, 'C'], [20, 'B'], [35, 'A'], [50, 'S']];

/** XP needed to go from `level` to `level + 1`. */
export const xpForNext = (level) => 100 * level * level;

export function levelInfo(totalXp) {
  let level = 1;
  let rem = totalXp;
  while (rem >= xpForNext(level)) { rem -= xpForNext(level); level++; }
  const need = xpForNext(level);
  return { level, xpIntoLevel: rem, xpForNext: need, progress: rem / need };
}
export const rankFor = (level) => RANKS.filter(([min]) => level >= min).pop()[1];
