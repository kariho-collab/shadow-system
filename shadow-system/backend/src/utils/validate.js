import { HttpError } from './errors.js';
import { CATEGORIES, DIFFICULTIES, MODES } from './xp.js';

const bad = (m) => { throw new HttpError(400, m); };
const str = (v) => (typeof v === 'string' ? v.trim() : '');

export function validateCredentials({ username, password, name }, registering) {
  const u = str(username);
  if (!/^[A-Za-z0-9_]{3,24}$/.test(u)) bad('Username must be 3-24 letters, numbers or underscores.');
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) bad('Password must be 8-128 characters.');
  const n = registering ? str(name) || u : null;
  if (registering && n.length > 24) bad('Player name must be 24 characters or fewer.');
  return { username: u, password, name: n };
}
export function validateQuest(b, partial = false) {
  const out = {};
  if (!partial || b.title !== undefined) {
    const t = str(b.title);
    if (!t || t.length > 80) bad('Title is required (max 80 characters).');
    out.title = t;
  }
  if (b.description !== undefined) {
    const d = str(b.description);
    if (d.length > 200) bad('Description must be 200 characters or fewer.');
    out.description = d;
  }
  if (!partial || b.category !== undefined) { if (!CATEGORIES.includes(b.category)) bad('Invalid category.'); out.category = b.category; }
  if (!partial || b.difficulty !== undefined) { if (!DIFFICULTIES.includes(b.difficulty)) bad('Invalid difficulty.'); out.difficulty = b.difficulty; }
  if (b.deadline !== undefined) {
    if (b.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(b.deadline)) bad('Deadline must be YYYY-MM-DD.');
    out.deadline = b.deadline || null;
  }
  return out;
}
export const validateMode = (m) => (MODES.includes(m) ? m : bad('Invalid mode.'));
export function validateProfile(b) {
  const out = {};
  if (b.name !== undefined) { const n = str(b.name); if (!n || n.length > 24) bad('Player name must be 1-24 characters.'); out.name = n; }
  if (b.avatar !== undefined) { if (!/^sigil-[1-6]$/.test(b.avatar)) bad('Invalid avatar.'); out.avatar = b.avatar; }
  return out;
}
export function validateId(v) { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : bad('Invalid id.'); }
