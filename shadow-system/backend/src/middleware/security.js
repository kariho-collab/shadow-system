import rateLimit from 'express-rate-limit';

export const securityHeaders = (_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  });
  next();
};
const limiter = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: message } });
export const apiLimiter = limiter(15 * 60 * 1000, 600, 'Too many requests. Slow down.');
export const authLimiter = limiter(15 * 60 * 1000, 20, 'Too many login attempts. Try again later.');
