export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(username) BETWEEN 3 AND 24),
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT 'sigil-1',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS player_stats (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 200),
  category TEXT NOT NULL CHECK (category IN ('BODY','ACADEMY','CYBER FORGE','QUANT LAB','WEALTH','INNER KINGDOM')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','normal','hard','elite')),
  xp_reward INTEGER NOT NULL CHECK (xp_reward > 0),
  deadline TEXT,
  kind TEXT NOT NULL DEFAULT 'custom' CHECK (kind IN ('custom','training')),
  exercise_code TEXT,
  target INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_quests_user ON quests(user_id, is_active);
CREATE TABLE IF NOT EXISTS quest_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id INTEGER NOT NULL REFERENCES quests(id),
  category TEXT NOT NULL,
  completed_on TEXT NOT NULL,
  xp_awarded INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'normal',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (quest_id, completed_on)
);
CREATE INDEX IF NOT EXISTS idx_completions_user ON quest_completions(user_id, completed_on);
CREATE TABLE IF NOT EXISTS xp_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  reason TEXT NOT NULL,
  completion_id INTEGER UNIQUE REFERENCES quest_completions(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_xp_user ON xp_transactions(user_id, created_at);
CREATE TRIGGER IF NOT EXISTS xp_no_update BEFORE UPDATE ON xp_transactions
  BEGIN SELECT RAISE(ABORT, 'xp_transactions is immutable'); END;
CREATE TRIGGER IF NOT EXISTS xp_no_delete BEFORE DELETE ON xp_transactions
  BEGIN SELECT RAISE(ABORT, 'xp_transactions is immutable'); END;
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  xp_required INTEGER NOT NULL,
  UNIQUE (branch, name)
);
CREATE TABLE IF NOT EXISTS player_skills (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, skill_id)
);
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS player_achievements (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id),
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, achievement_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notifications(user_id, created_at);
CREATE TABLE IF NOT EXISTS daily_activity (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  quests_completed INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'normal' CHECK (mode IN ('normal','recovery','low_energy')),
  PRIMARY KEY (user_id, date)
);
`;

const XP_STEPS = [30, 100, 250, 500, 800];
const BRANCHES = [
  ['BODY', 'BODY', ['Physical strength', 'Endurance', 'Consistency']],
  ['INTELLIGENCE', 'ACADEMY', ['Critical thinking', 'Mathematics', 'Problem solving']],
  ['CYBER FORGE', 'CYBER FORGE', ['Programming', 'Full-stack development', 'Cybersecurity', 'Software engineering']],
  ['QUANT LAB', 'QUANT LAB', ['Statistics', 'Python', 'Quantitative research', 'Machine learning', 'Backtesting']],
  ['INNER KINGDOM', 'INNER KINGDOM', ['Emotional resilience', 'Self-discipline', 'Self-awareness']],
];
export const SKILL_SEED = BRANCHES.flatMap(([branch, category, names]) =>
  names.map((name, i) => [branch, category, name, i, XP_STEPS[i]]));

export const ACHIEVEMENT_SEED = [
  ['FIRST_AWAKENING', 'FIRST AWAKENING', 'Enter the System.'],
  ['FIRST_QUEST', 'FIRST QUEST COMPLETED', 'Complete any quest.'],
  ['SEVEN_DAY', 'SEVEN-DAY CONSISTENCY', 'Reach a 7-day streak. Rest days count.'],
  ['BODY_AWAKENING', 'BODY AWAKENING', 'Complete 5 BODY quests.'],
  ['CODE_APPRENTICE', 'CODE APPRENTICE', 'Complete 5 CYBER FORGE quests.'],
  ['QUANT_RESEARCHER', 'QUANT RESEARCHER', 'Complete 5 QUANT LAB quests.'],
  ['EXAM_SURVIVOR', 'EXAM SURVIVOR', 'Complete 10 ACADEMY quests.'],
  ['DISCIPLINE_UNLOCKED', 'DISCIPLINE UNLOCKED', 'Complete 10 INNER KINGDOM quests.'],
];
