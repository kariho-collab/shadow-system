import { HttpError } from '../utils/errors.js';
import { hashPassword, verifyPassword } from '../utils/auth.js';
import { today, addDays } from '../utils/dates.js';
import { EXERCISES, SESSIONS_PER_STEP, effectiveTarget, targetLabel } from '../utils/training.js';
import { CATEGORIES, DIFFICULTIES, DIFFICULTY_XP, ATTRIBUTE_MAP, levelInfo, rankFor } from '../utils/xp.js';

const STARTER_QUESTS = [
  ['Drink enough water', 'BODY', 'easy'],
  ['Study one university topic', 'ACADEMY', 'normal'],
  ['Write code for 30 minutes', 'CYBER FORGE', 'normal'],
  ['Research EUR/USD', 'QUANT LAB', 'normal'],
  ['Track today’s expenses', 'WEALTH', 'easy'],
  ['Journal and reflect', 'INNER KINGDOM', 'easy'],
  ['Read for 20 minutes', 'INNER KINGDOM', 'easy'],
];

export function createGame(db) {
  const q = (sql) => db.prepare(sql);

  function tx(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  const notify = (userId, message, kind = 'info') =>
    q('INSERT INTO notifications(user_id,message,kind) VALUES(?,?,?)').run(userId, message, kind);

  // ---------- auth ----------
  function register({ username, password, name }) {
    if (q('SELECT 1 FROM users WHERE username = ?').get(username)) throw new HttpError(409, 'That username is taken.');
    return tx(() => {
      const { lastInsertRowid } = q('INSERT INTO users(username,password_hash,name) VALUES(?,?,?)').run(username, hashPassword(password), name);
      const id = Number(lastInsertRowid);
      q('INSERT INTO player_stats(user_id) VALUES(?)').run(id);
      const ins = q('INSERT INTO quests(user_id,title,category,difficulty,xp_reward) VALUES(?,?,?,?,?)');
      STARTER_QUESTS.forEach(([t, c, d]) => ins.run(id, t, c, d, DIFFICULTY_XP[d]));
      const tr = q('INSERT INTO quests(user_id,title,description,category,difficulty,xp_reward,kind,exercise_code,target) VALUES(?,?,?,?,?,?,?,?,?)');
      Object.entries(EXERCISES).forEach(([code, e]) => tr.run(id, e.title, e.description, 'BODY', 'normal', DIFFICULTY_XP.normal, 'training', code, e.start));
      notify(id, 'A new daily quest has appeared.');
      checkProgress(id);
      return publicUser(id);
    });
  }
  function login({ username, password }) {
    const u = q('SELECT * FROM users WHERE username = ?').get(username);
    // Always run a hash comparison so timing doesn't reveal whether the user exists.
    const ok = verifyPassword(password, u ? u.password_hash : 'scrypt$00$00');
    if (!u || !ok) throw new HttpError(401, 'Invalid username or password.');
    return publicUser(u.id);
  }
  const publicUser = (id) => {
    const u = q('SELECT id,username,name,avatar,created_at FROM users WHERE id = ?').get(id);
    if (!u) throw new HttpError(401, 'Account not found.');
    return { ...u };
  };

  // ---------- streak and mode ----------
  function activeDates(userId) {
    return new Set(q("SELECT date FROM daily_activity WHERE user_id=? AND (quests_completed>0 OR mode!='normal')").all(userId).map((r) => r.date));
  }
  function computeStreak(userId) {
    const set = activeDates(userId);
    let d = today();
    if (!set.has(d)) d = addDays(d, -1);
    let n = 0;
    while (set.has(d)) { n++; d = addDays(d, -1); }
    return n;
  }
  function refreshStreak(userId) {
    const s = computeStreak(userId);
    q("UPDATE player_stats SET current_streak=?, longest_streak=MAX(longest_streak,?), updated_at=datetime('now') WHERE user_id=?").run(s, s, userId);
    return s;
  }
  const todayMode = (userId) => q('SELECT mode FROM daily_activity WHERE user_id=? AND date=?').get(userId, today())?.mode ?? 'normal';
  function setMode(userId, mode) {
    return tx(() => {
      q(`INSERT INTO daily_activity(user_id,date,mode) VALUES(?,?,?)
         ON CONFLICT(user_id,date) DO UPDATE SET mode=excluded.mode`).run(userId, today(), mode);
      if (mode !== 'normal') notify(userId, mode === 'recovery' ? 'Recovery mode activated.' : 'Low-energy day activated. Take it gently.', 'recovery');
      const streak = refreshStreak(userId);
      const unlocked = checkProgress(userId);
      return { mode, streak, unlocked };
    });
  }

  // ---------- unlocks ----------
  const catXp = (userId, cat) => q('SELECT COALESCE(SUM(amount),0) AS x FROM xp_transactions WHERE user_id=? AND category=?').get(userId, cat).x;
  const compCount = (userId, cat) => q('SELECT COUNT(*) AS n FROM quest_completions WHERE user_id=? AND category=?').get(userId, cat).n;
  const ACH_RULES = {
    FIRST_AWAKENING: () => true,
    FIRST_QUEST: (u) => q('SELECT COUNT(*) AS n FROM quest_completions WHERE user_id=?').get(u).n >= 1,
    SEVEN_DAY: (u) => q('SELECT longest_streak AS s FROM player_stats WHERE user_id=?').get(u).s >= 7,
    BODY_AWAKENING: (u) => compCount(u, 'BODY') >= 5,
    CODE_APPRENTICE: (u) => compCount(u, 'CYBER FORGE') >= 5,
    QUANT_RESEARCHER: (u) => compCount(u, 'QUANT LAB') >= 5,
    EXAM_SURVIVOR: (u) => compCount(u, 'ACADEMY') >= 10,
    DISCIPLINE_UNLOCKED: (u) => compCount(u, 'INNER KINGDOM') >= 10,
  };
  function checkProgress(userId) {
    const unlocked = { skills: [], achievements: [] };
    for (const s of q('SELECT * FROM skills WHERE id NOT IN (SELECT skill_id FROM player_skills WHERE user_id=?) ORDER BY position').all(userId)) {
      // progressive: previous skill in the branch must already be unlocked
      const prev = s.position === 0 || q('SELECT 1 FROM player_skills ps JOIN skills k ON k.id=ps.skill_id WHERE ps.user_id=? AND k.branch=? AND k.position=?').get(userId, s.branch, s.position - 1);
      if (prev && catXp(userId, s.category) >= s.xp_required) {
        q('INSERT INTO player_skills(user_id,skill_id) VALUES(?,?)').run(userId, s.id);
        notify(userId, `Skill unlocked: ${s.name}.`, 'skill');
        unlocked.skills.push(s.name);
      }
    }
    for (const a of q('SELECT * FROM achievements WHERE id NOT IN (SELECT achievement_id FROM player_achievements WHERE user_id=?)').all(userId)) {
      if (ACH_RULES[a.code]?.(userId)) {
        q('INSERT INTO player_achievements(user_id,achievement_id) VALUES(?,?)').run(userId, a.id);
        notify(userId, `Achievement unlocked: ${a.name}.`, 'achievement');
        unlocked.achievements.push(a.name);
      }
    }
    return unlocked;
  }

  // ---------- quests ----------
  const ownQuest = (userId, id) => {
    const r = q('SELECT * FROM quests WHERE id=? AND user_id=? AND is_active=1').get(id, userId);
    if (!r) throw new HttpError(404, 'Quest not found.');
    return r;
  };
  function listQuests(userId) {
    const d = today(), mode = todayMode(userId);
    const counts = Object.fromEntries(q("SELECT quest_id, COUNT(*) AS n FROM quest_completions WHERE user_id=? AND mode='normal' GROUP BY quest_id").all(userId).map((r) => [r.quest_id, r.n]));
    return q(`SELECT q.id,q.title,q.description,q.category,q.difficulty,q.xp_reward,q.deadline,q.kind,q.exercise_code,q.target,
      EXISTS(SELECT 1 FROM quest_completions c WHERE c.quest_id=q.id AND c.completed_on=?) AS completed_today
      FROM quests q WHERE q.user_id=? AND q.is_active=1 ORDER BY q.category,q.id`).all(d, userId)
      .map((r) => {
        const out = { ...r, completed_today: !!r.completed_today };
        if (r.kind === 'training') {
          const e = EXERCISES[r.exercise_code];
          const eff = effectiveTarget(r.exercise_code, r.target, mode);
          Object.assign(out, {
            unit: e.unit, goal: e.goal, effective_target: eff, target_label: targetLabel(r.exercise_code, eff),
            goal_label: targetLabel(r.exercise_code, e.goal), at_goal: r.target >= e.goal, reduced: mode !== 'normal',
            sessions_to_next: r.target >= e.goal ? 0 : SESSIONS_PER_STEP - ((counts[r.id] ?? 0) % SESSIONS_PER_STEP),
          });
        }
        return out;
      });
  }
  function createQuest(userId, v) {
    const r = q('INSERT INTO quests(user_id,title,description,category,difficulty,xp_reward,deadline) VALUES(?,?,?,?,?,?,?)')
      .run(userId, v.title, v.description ?? '', v.category, v.difficulty, DIFFICULTY_XP[v.difficulty], v.deadline ?? null);
    notify(userId, 'A new daily quest has appeared.');
    return ownQuest(userId, Number(r.lastInsertRowid));
  }
  function updateQuest(userId, id, v) {
    const cur = ownQuest(userId, id);
    if (cur.kind === 'training') throw new HttpError(400, 'Training quests are managed by the System.');
    const n = { ...cur, ...v };
    q("UPDATE quests SET title=?,description=?,category=?,difficulty=?,xp_reward=?,deadline=?,updated_at=datetime('now') WHERE id=?")
      .run(n.title, n.description, n.category, n.difficulty, DIFFICULTY_XP[n.difficulty], n.deadline, id);
    return ownQuest(userId, id);
  }
  function deleteQuest(userId, id) {
    ownQuest(userId, id);
    q("UPDATE quests SET is_active=0, updated_at=datetime('now') WHERE id=?").run(id); // soft delete keeps history intact
  }
  function lightenQuest(userId, id) {
    const cur = ownQuest(userId, id);
    if (cur.kind === 'training') throw new HttpError(400, 'Training targets are halved automatically on recovery and low-energy days.');
    const i = DIFFICULTIES.indexOf(cur.difficulty);
    if (i === 0) throw new HttpError(400, 'This quest is already at the lowest difficulty.');
    notify(userId, 'Quest difficulty reduced.', 'recovery');
    return updateQuest(userId, id, { difficulty: DIFFICULTIES[i - 1] });
  }

  /** The only place XP is awarded. Runs as one transaction; the client never supplies an amount. */
  function completeQuest(userId, id) {
    return tx(() => {
      const quest = ownQuest(userId, id);
      const date = today();
      if (q('SELECT 1 FROM quest_completions WHERE quest_id=? AND completed_on=?').get(id, date)) {
        throw new HttpError(409, 'Reward already claimed today.');
      }
      const before = q('SELECT total_xp FROM player_stats WHERE user_id=?').get(userId).total_xp;
      const mode = todayMode(userId);
      const comp = q('INSERT INTO quest_completions(user_id,quest_id,category,completed_on,xp_awarded,mode) VALUES(?,?,?,?,?,?)')
        .run(userId, id, quest.category, date, quest.xp_reward, mode);
      q('INSERT INTO xp_transactions(user_id,amount,category,reason,completion_id) VALUES(?,?,?,?,?)')
        .run(userId, quest.xp_reward, quest.category, quest.title, Number(comp.lastInsertRowid));
      const total = before + quest.xp_reward;
      const prev = levelInfo(before), next = levelInfo(total);
      q("UPDATE player_stats SET total_xp=?, level=?, updated_at=datetime('now') WHERE user_id=?").run(total, next.level, userId);
      q(`INSERT INTO daily_activity(user_id,date,xp_earned,quests_completed) VALUES(?,?,?,1)
         ON CONFLICT(user_id,date) DO UPDATE SET xp_earned=xp_earned+excluded.xp_earned, quests_completed=quests_completed+1`)
        .run(userId, date, quest.xp_reward);
      refreshStreak(userId);
      notify(userId, 'Quest completed.', 'quest');
      notify(userId, `Experience acquired: +${quest.xp_reward} XP.`, 'xp');
      const leveledUp = next.level > prev.level;
      if (leveledUp) notify(userId, 'LEVEL UP!', 'level');
      let progression = null;
      if (quest.kind === 'training' && mode === 'normal') {
        const e = EXERCISES[quest.exercise_code];
        const n = q("SELECT COUNT(*) AS n FROM quest_completions WHERE quest_id=? AND mode='normal'").get(id).n;
        if (n % SESSIONS_PER_STEP === 0 && quest.target < e.goal) {
          const target = Math.min(e.goal, quest.target + e.step);
          q("UPDATE quests SET target=?, updated_at=datetime('now') WHERE id=?").run(target, id);
          progression = { exercise: e.title, target, label: targetLabel(quest.exercise_code, target) };
          notify(userId, `Training intensity increased: ${e.title} is now ${progression.label}.`, 'training');
        }
      }
      const unlocked = checkProgress(userId);
      return { progression, xpAwarded: quest.xp_reward, totalXp: total, level: next.level, previousLevel: prev.level, leveledUp, rank: rankFor(next.level), unlocked };
    });
  }

  // ---------- player ----------
  function attributes(userId) {
    const out = { Strength: 0, Endurance: 0, Intelligence: 0, Discipline: 0, Knowledge: 0, 'Technical Skills': 0 };
    for (const r of q('SELECT category, SUM(amount) AS x FROM xp_transactions WHERE user_id=? GROUP BY category').all(userId)) {
      const t = ATTRIBUTE_MAP[r.category];
      t.forEach((a) => { out[a] += r.x / t.length; });
    }
    return Object.entries(out).map(([name, xp]) => ({ name, xp: Math.round(xp), value: Math.floor(xp / 20) + 1, progress: (xp % 20) / 20 }));
  }
  function getPlayer(userId) {
    const user = publicUser(userId);
    const s = q('SELECT * FROM player_stats WHERE user_id=?').get(userId);
    const info = levelInfo(s.total_xp);
    return {
      user, level: info.level, rank: rankFor(info.level), totalXp: s.total_xp,
      xpIntoLevel: info.xpIntoLevel, xpForNext: info.xpForNext, progress: info.progress,
      totalQuests: q('SELECT COUNT(*) AS n FROM quest_completions WHERE user_id=?').get(userId).n,
      streak: computeStreak(userId), longestStreak: s.longest_streak, mode: todayMode(userId),
      attributes: attributes(userId),
    };
  }
  function updateProfile(userId, v) {
    const cur = publicUser(userId);
    const n = { ...cur, ...v };
    q('UPDATE users SET name=?, avatar=? WHERE id=?').run(n.name, n.avatar, userId);
    return publicUser(userId);
  }

  function skills(userId) {
    const rows = q(`SELECT k.id,k.branch,k.category,k.name,k.position,k.xp_required,
      EXISTS(SELECT 1 FROM player_skills p WHERE p.skill_id=k.id AND p.user_id=?) AS unlocked
      FROM skills k ORDER BY k.id`).all(userId);
    const xp = Object.fromEntries(CATEGORIES.map((c) => [c, catXp(userId, c)]));
    return rows.map((r) => ({ ...r, unlocked: !!r.unlocked, categoryXp: xp[r.category] }));
  }
  const achievements = (userId) => q(`SELECT a.code,a.name,a.description,p.unlocked_at
    FROM achievements a LEFT JOIN player_achievements p ON p.achievement_id=a.id AND p.user_id=? ORDER BY a.id`).all(userId).map((r) => ({ ...r }));
  const notifications = (userId) => q('SELECT id,message,kind,is_read,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 60').all(userId).map((r) => ({ ...r }));
  const markRead = (userId) => q('UPDATE notifications SET is_read=1 WHERE user_id=?').run(userId);
  const xpHistory = (userId, limit = 50) => q('SELECT id,amount,category,reason,created_at FROM xp_transactions WHERE user_id=? ORDER BY id DESC LIMIT ?').all(userId, Math.min(Number(limit) || 50, 200)).map((r) => ({ ...r }));

  function analytics(userId) {
    const end = today(), start = addDays(end, -29);
    const rows = q('SELECT date,xp_earned,quests_completed,mode FROM daily_activity WHERE user_id=? AND date>=?').all(userId, start);
    const byDate = Object.fromEntries(rows.map((r) => [r.date, r]));
    const daily = Array.from({ length: 30 }, (_, i) => {
      const date = addDays(start, i), r = byDate[date];
      return { date, xp: r?.xp_earned ?? 0, quests: r?.quests_completed ?? 0, mode: r?.mode ?? 'normal' };
    });
    const week = daily.slice(-7);
    const byCategory = CATEGORIES.map((category) => ({ category, xp: catXp(userId, category), completed: compCount(userId, category) }));
    const sk = skills(userId);
    return {
      daily, byCategory,
      weekly: { activeDays: week.filter((d) => d.quests > 0 || d.mode !== 'normal').length, questsCompleted: week.reduce((a, d) => a + d.quests, 0) },
      skillProgress: { unlocked: sk.filter((s) => s.unlocked).length, total: sk.length },
      history: xpHistory(userId, 15),
    };
  }

  return { register, login, publicUser, getPlayer, updateProfile, listQuests, createQuest, updateQuest, deleteQuest, lightenQuest,
    completeQuest, setMode, skills, achievements, notifications, markRead, xpHistory, analytics, computeStreak };
}
