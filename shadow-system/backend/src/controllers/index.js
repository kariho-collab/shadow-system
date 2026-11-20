import { signToken } from '../utils/auth.js';
import { validateCredentials, validateQuest, validateMode, validateProfile, validateId } from '../utils/validate.js';

export function createControllers(game, { jwtSecret, jwtTtlHours }) {
  const session = (user) => ({ token: signToken({ sub: user.id }, jwtSecret, jwtTtlHours), user });
  return {
    register: (req, res) => res.status(201).json(session(game.register(validateCredentials(req.body ?? {}, true)))),
    login: (req, res) => res.json(session(game.login(validateCredentials(req.body ?? {}, false)))),
    player: (req, res) => res.json(game.getPlayer(req.userId)),
    updatePlayer: (req, res) => res.json(game.updateProfile(req.userId, validateProfile(req.body ?? {}))),
    listQuests: (req, res) => res.json(game.listQuests(req.userId)),
    createQuest: (req, res) => res.status(201).json(game.createQuest(req.userId, validateQuest(req.body ?? {}))),
    updateQuest: (req, res) => res.json(game.updateQuest(req.userId, validateId(req.params.id), validateQuest(req.body ?? {}, true))),
    deleteQuest: (req, res) => { game.deleteQuest(req.userId, validateId(req.params.id)); res.status(204).end(); },
    completeQuest: (req, res) => res.json(game.completeQuest(req.userId, validateId(req.params.id))),
    lightenQuest: (req, res) => res.json(game.lightenQuest(req.userId, validateId(req.params.id))),
    setMode: (req, res) => res.json(game.setMode(req.userId, validateMode(req.body?.mode))),
    xp: (req, res) => res.json(game.xpHistory(req.userId, req.query.limit)),
    skills: (req, res) => res.json(game.skills(req.userId)),
    achievements: (req, res) => res.json(game.achievements(req.userId)),
    notifications: (req, res) => res.json(game.notifications(req.userId)),
    readNotifications: (req, res) => { game.markRead(req.userId); res.status(204).end(); },
    analytics: (req, res) => res.json(game.analytics(req.userId)),
  };
}
