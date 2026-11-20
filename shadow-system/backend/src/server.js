import { openDb } from './db/index.js';
import { createApp } from './app.js';

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 || secret.startsWith('replace-with')) {
  console.error('JWT_SECRET is missing or too weak. Copy .env.example to .env and set a random value of 32+ characters.');
  process.exit(1);
}
const db = openDb(process.env.DB_FILE || './data/shadow.db');
const app = createApp(db, {
  jwtSecret: secret,
  jwtTtlHours: Number(process.env.JWT_TTL_HOURS) || 72,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
});
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`[ SYSTEM ] online on http://localhost:${port}`));
