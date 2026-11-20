import express from 'express';
import cors from 'cors';
import { createGame } from './services/game.js';
import { createControllers } from './controllers/index.js';
import { createRoutes } from './routes/index.js';
import { securityHeaders, apiLimiter } from './middleware/security.js';
import { notFound, errorHandler } from './middleware/errors.js';

export function createApp(db, { jwtSecret, jwtTtlHours = 72, clientOrigin }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json({ limit: '20kb' }));
  app.use('/api', apiLimiter);
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', createRoutes(createControllers(createGame(db), { jwtSecret, jwtTtlHours }), jwtSecret));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
