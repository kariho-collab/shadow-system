import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';

const wrap = (fn) => (req, res, next) => { try { fn(req, res, next); } catch (e) { next(e); } };

export function createRoutes(c, jwtSecret) {
  const r = Router();
  r.post('/auth/register', authLimiter, wrap(c.register));
  r.post('/auth/login', authLimiter, wrap(c.login));
  r.use(requireAuth(jwtSecret));
  r.get('/player', wrap(c.player));
  r.patch('/player', wrap(c.updatePlayer));
  r.get('/quests', wrap(c.listQuests));
  r.post('/quests', wrap(c.createQuest));
  r.put('/quests/:id', wrap(c.updateQuest));
  r.delete('/quests/:id', wrap(c.deleteQuest));
  r.post('/quests/:id/complete', wrap(c.completeQuest));
  r.post('/quests/:id/lighten', wrap(c.lightenQuest));
  r.post('/recovery', wrap(c.setMode));
  r.get('/xp', wrap(c.xp));
  r.get('/skills', wrap(c.skills));
  r.get('/achievements', wrap(c.achievements));
  r.get('/notifications', wrap(c.notifications));
  r.post('/notifications/read', wrap(c.readNotifications));
  r.get('/analytics', wrap(c.analytics));
  return r;
}
