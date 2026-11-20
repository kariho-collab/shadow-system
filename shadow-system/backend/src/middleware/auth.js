import { verifyToken } from '../utils/auth.js';
import { HttpError } from '../utils/errors.js';

export const requireAuth = (secret) => (req, _res, next) => {
  const h = req.headers.authorization || '';
  const payload = h.startsWith('Bearer ') ? verifyToken(h.slice(7), secret) : null;
  if (!payload) return next(new HttpError(401, 'Authentication required.'));
  req.userId = payload.sub;
  next();
};
