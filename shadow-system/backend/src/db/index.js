import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SCHEMA, SKILL_SEED, ACHIEVEMENT_SEED } from './schema.js';

export function openDb(file = ':memory:') {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  const sk = db.prepare('INSERT OR IGNORE INTO skills(branch,category,name,position,xp_required) VALUES(?,?,?,?,?)');
  SKILL_SEED.forEach((r) => sk.run(...r));
  const ac = db.prepare('INSERT OR IGNORE INTO achievements(code,name,description) VALUES(?,?,?)');
  ACHIEVEMENT_SEED.forEach((r) => ac.run(...r));
  return db;
}
