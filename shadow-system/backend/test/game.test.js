import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db/index.js';
import { createGame } from '../src/services/game.js';
import { levelInfo, xpForNext, rankFor } from '../src/utils/xp.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/utils/auth.js';
import { today, addDays } from '../src/utils/dates.js';
import { validateQuest } from '../src/utils/validate.js';

function setup() {
  const db = openDb(':memory:');
  const game = createGame(db);
  const user = game.register({ username: 'jinwoo', password: 'correct-horse', name: 'Jin-Woo' });
  return { db, game, user };
}
const quests = (g, id) => g.listQuests(id);

test('XP formula matches the spec', () => {
  assert.deepEqual([1, 2, 3, 4].map(xpForNext), [100, 400, 900, 1600]);
  assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2);
  assert.equal(levelInfo(499).level, 2);
  assert.equal(levelInfo(500).level, 3);
  assert.equal(levelInfo(1400).level, 4);
  assert.equal(rankFor(1), 'E');
  assert.equal(rankFor(10), 'C');
});

test('passwords are hashed and verified; tokens expire and resist tampering', () => {
  const h = hashPassword('secret-pass');
  assert.ok(!h.includes('secret-pass'));
  assert.ok(verifyPassword('secret-pass', h));
  assert.ok(!verifyPassword('wrong', h));
  const t = signToken({ sub: 1 }, 'k'.repeat(32));
  assert.equal(verifyToken(t, 'k'.repeat(32)).sub, 1);
  assert.equal(verifyToken(t, 'x'.repeat(32)), null);
  assert.equal(verifyToken(t.slice(0, -2) + 'aa', 'k'.repeat(32)), null);
  assert.equal(verifyToken(signToken({ sub: 1 }, 'k'.repeat(32), -1), 'k'.repeat(32)), null);
});

test('register seeds quests, stats, and the first achievement; usernames are unique', () => {
  const { game, user } = setup();
  assert.equal(quests(game, user.id).length, 11);
  const p = game.getPlayer(user.id);
  assert.equal(p.level, 1);
  assert.equal(p.totalXp, 0);
  assert.ok(game.achievements(user.id).find((a) => a.code === 'FIRST_AWAKENING').unlocked_at);
  assert.throws(() => game.register({ username: 'JINWOO', password: 'another-pass', name: 'x' }), /taken/);
  assert.throws(() => game.login({ username: 'jinwoo', password: 'wrong-pass' }), /Invalid/);
  assert.equal(game.login({ username: 'jinwoo', password: 'correct-horse' }).id, user.id);
});

test('completing a quest awards server-calculated XP once per day', () => {
  const { game, user } = setup();
  const q = quests(game, user.id).find((x) => x.difficulty === 'normal');
  const r = game.completeQuest(user.id, q.id);
  assert.equal(r.xpAwarded, 25);
  assert.equal(game.getPlayer(user.id).totalXp, 25);
  assert.throws(() => game.completeQuest(user.id, q.id), /already claimed/);
  assert.equal(game.getPlayer(user.id).totalXp, 25);
  assert.equal(game.xpHistory(user.id).length, 1);
  assert.ok(game.achievements(user.id).find((a) => a.code === 'FIRST_QUEST').unlocked_at);
});

test('XP ledger is immutable', () => {
  const { db, game, user } = setup();
  game.completeQuest(user.id, quests(game, user.id)[0].id);
  assert.throws(() => db.prepare('UPDATE xp_transactions SET amount = 9999').run(), /immutable/);
  assert.throws(() => db.prepare('DELETE FROM xp_transactions').run(), /immutable/);
});

test('level-up is detected and stats stay consistent with the ledger', () => {
  const { db, game, user } = setup();
  const big = game.createQuest(user.id, { title: 'Boss', category: 'BODY', difficulty: 'elite' });
  const r = game.completeQuest(user.id, big.id);
  assert.equal(r.leveledUp, true);
  assert.equal(r.level, 2);
  const sum = db.prepare('SELECT SUM(amount) AS s FROM xp_transactions WHERE user_id=?').get(user.id).s;
  assert.equal(game.getPlayer(user.id).totalXp, sum);
  assert.ok(game.notifications(user.id).some((n) => n.message === 'LEVEL UP!'));
});

test('a failed completion rolls back completely', () => {
  const { db, game, user } = setup();
  const q = quests(game, user.id)[0];
  db.exec("CREATE TRIGGER boom BEFORE INSERT ON daily_activity BEGIN SELECT RAISE(ABORT,'boom'); END;");
  assert.throws(() => game.completeQuest(user.id, q.id), /boom/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM xp_transactions').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM quest_completions').get().n, 0);
  assert.equal(game.getPlayer(user.id).totalXp, 0);
});

test('users cannot touch each other’s quests', () => {
  const { game, user } = setup();
  const other = game.register({ username: 'intruder', password: 'long-enough-pw', name: 'X' });
  const q = quests(game, user.id)[0];
  assert.throws(() => game.completeQuest(other.id, q.id), /not found/);
  assert.throws(() => game.deleteQuest(other.id, q.id), /not found/);
  assert.throws(() => game.updateQuest(other.id, q.id, { title: 'hacked' }), /not found/);
});

test('deleting a quest keeps earned XP and history', () => {
  const { game, user } = setup();
  const q = quests(game, user.id)[0];
  game.completeQuest(user.id, q.id);
  game.deleteQuest(user.id, q.id);
  assert.equal(quests(game, user.id).length, 10);
  assert.equal(game.getPlayer(user.id).totalXp, q.xp_reward);
});

test('quest validation rejects bad input; XP cannot be set by the client', () => {
  assert.throws(() => validateQuest({ title: '', category: 'BODY', difficulty: 'easy' }), /Title/);
  assert.throws(() => validateQuest({ title: 'x', category: 'NOPE', difficulty: 'easy' }), /category/);
  assert.throws(() => validateQuest({ title: 'x', category: 'BODY', difficulty: 'godlike' }), /difficulty/);
  assert.equal(validateQuest({ title: 'x', category: 'BODY', difficulty: 'easy', xp_reward: 99999 }).xp_reward, undefined);
});

test('lighten lowers difficulty and XP, and stops at easy', () => {
  const { game, user } = setup();
  const q = quests(game, user.id).find((x) => x.difficulty === 'normal' && x.kind === 'custom');
  const l = game.lightenQuest(user.id, q.id);
  assert.equal(l.difficulty, 'easy');
  assert.equal(l.xp_reward, 10);
  assert.throws(() => game.lightenQuest(user.id, q.id), /lowest/);
});

test('recovery days keep the streak and never remove XP', () => {
  const { db, game, user } = setup();
  const ins = db.prepare('INSERT INTO daily_activity(user_id,date,quests_completed,mode) VALUES(?,?,?,?)');
  ins.run(user.id, addDays(today(), -3), 2, 'normal');
  ins.run(user.id, addDays(today(), -2), 0, 'recovery');
  ins.run(user.id, addDays(today(), -1), 1, 'normal');
  game.completeQuest(user.id, quests(game, user.id)[0].id);
  assert.equal(game.getPlayer(user.id).streak, 4);
  const xp = game.getPlayer(user.id).totalXp;
  game.setMode(user.id, 'low_energy');
  assert.equal(game.getPlayer(user.id).totalXp, xp);
  assert.equal(game.getPlayer(user.id).mode, 'low_energy');
});

test('a missed day resets the streak but takes no XP', () => {
  const { db, game, user } = setup();
  db.prepare('INSERT INTO daily_activity(user_id,date,quests_completed) VALUES(?,?,?)').run(user.id, addDays(today(), -5), 3);
  assert.equal(game.getPlayer(user.id).streak, 0);
});

test('skills unlock progressively from category XP', () => {
  const { game, user } = setup();
  const b = game.createQuest(user.id, { title: 'Heavy', category: 'BODY', difficulty: 'elite' });
  const r = game.completeQuest(user.id, b.id); // 100 BODY xp -> first two BODY skills (30, 100)
  assert.deepEqual(r.unlocked.skills, ['Physical strength', 'Endurance']);
  const sk = game.skills(user.id).filter((s) => s.branch === 'BODY');
  assert.deepEqual(sk.map((s) => s.unlocked), [true, true, false]);
});

test('analytics reflect real database rows', () => {
  const { game, user } = setup();
  game.completeQuest(user.id, quests(game, user.id).find((x) => x.category === 'CYBER FORGE').id);
  const a = game.analytics(user.id);
  assert.equal(a.daily.length, 30);
  assert.equal(a.daily.at(-1).xp, 25);
  assert.equal(a.byCategory.find((c) => c.category === 'CYBER FORGE').xp, 25);
  assert.equal(a.weekly.activeDays, 1);
});

const trainingQ = (g, id, code) => g.listQuests(id).find((x) => x.exercise_code === code);
const addPast = (db, userId, questId, n, mode = 'normal') => {
  for (let i = 1; i <= n; i++) {
    db.prepare('INSERT INTO quest_completions(user_id,quest_id,category,completed_on,xp_awarded,mode) VALUES(?,?,?,?,?,?)')
      .run(userId, questId, 'BODY', addDays(today(), -i - 10), 25, mode);
  }
};

test('daily training quests are seeded at beginner level and reset each day', () => {
  const { game, user } = setup();
  const t = game.listQuests(user.id).filter((x) => x.kind === 'training');
  assert.deepEqual(t.map((x) => x.exercise_code), ['pushups', 'situps', 'squats', 'run']);
  assert.equal(trainingQ(game, user.id, 'pushups').target_label, '10 reps');
  assert.equal(trainingQ(game, user.id, 'run').target_label, '1 km');
  assert.equal(trainingQ(game, user.id, 'run').goal_label, '10 km');
  game.completeQuest(user.id, t[0].id);
  assert.equal(trainingQ(game, user.id, 'pushups').completed_today, true);
  assert.equal(trainingQ(game, user.id, 'situps').completed_today, false);
});

test('training target rises after 5 normal-day sessions, and stops at the goal', () => {
  const { db, game, user } = setup();
  const p = trainingQ(game, user.id, 'pushups');
  addPast(db, user.id, p.id, 4);
  const r = game.completeQuest(user.id, p.id);
  assert.equal(r.progression.target, 15);
  assert.equal(trainingQ(game, user.id, 'pushups').target_label, '15 reps');
  const run = trainingQ(game, user.id, 'run');
  addPast(db, user.id, run.id, 4);
  assert.equal(game.completeQuest(user.id, run.id).progression.label, '1.5 km');
  const s = trainingQ(game, user.id, 'squats');
  db.prepare('UPDATE quests SET target=100 WHERE id=?').run(s.id);
  addPast(db, user.id, s.id, 4);
  assert.equal(game.completeQuest(user.id, s.id).progression, null);
  assert.equal(trainingQ(game, user.id, 'squats').target, 100);
});

test('recovery and low-energy days halve targets and do not count toward progression', () => {
  const { db, game, user } = setup();
  game.setMode(user.id, 'recovery');
  assert.equal(trainingQ(game, user.id, 'pushups').effective_target, 5);
  assert.equal(trainingQ(game, user.id, 'run').target_label, '0.5 km');
  const p = trainingQ(game, user.id, 'pushups');
  addPast(db, user.id, p.id, 4);
  const r = game.completeQuest(user.id, p.id);
  assert.equal(r.progression, null);
  assert.equal(r.xpAwarded, 25); // full XP, no penalty for resting
  assert.equal(trainingQ(game, user.id, 'pushups').target, 10);
});

test('training quests cannot be edited or lightened by the client', () => {
  const { game, user } = setup();
  const p = trainingQ(game, user.id, 'pushups');
  assert.throws(() => game.updateQuest(user.id, p.id, { title: 'cheat' }), /managed/);
  assert.throws(() => game.lightenQuest(user.id, p.id), /halved/);
});
