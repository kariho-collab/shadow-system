# SHADOW SYSTEM 2.1

A real-life Solo Leveling-style RPG. Daily activities become quests, XP, skills and achievements.

- **Frontend:** React 18, Vite, Framer Motion, Lucide icons, Recharts, custom CSS design tokens
- **Backend:** Node.js, Express, SQLite, JWT auth (HS256), scrypt password hashing
- **Rules:** the server decides every XP amount and level. XP history is append-only. XP is never removed.

## Requirements

Node.js **22.13 or newer** (the backend uses the built-in `node:sqlite`, so there is no native module to compile).

## Run it

```bash
# Terminal 1: backend
cd backend
cp .env.example .env        # then set JWT_SECRET (see below)
npm install
npm run dev                 # http://localhost:4000

# Terminal 2: frontend
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
The server refuses to start with a missing or weak `JWT_SECRET`.

## Tests

```bash
cd backend && npm test
```

Covers the daily training rules (seeding, progression, goal cap, recovery halving), the XP formula, password hashing and tokens, duplicate-reward protection, the immutable XP ledger,
transaction rollback, level-ups, ownership checks, validation, recovery and streaks, skill unlocks and analytics.
There are no frontend or HTTP-route tests yet.

## Structure

```
backend/src
  db/           schema, seed data, connection
  services/     game logic (XP engine, quests, unlocks, analytics)
  controllers/  request handling
  routes/       URL map
  middleware/   auth, rate limits, headers, errors
  utils/        xp formulas, auth crypto, validation, dates
frontend/src
  styles/       tokens.css (design tokens), global.css
  components/   ui primitives, overlays (init, level-up, toasts)
  pages/        Status, Quests, Skills, Achievements, Analytics, Log, Auth
  hooks/        app context and data loading
  services/     API client
```

## How XP is kept honest

- `POST /api/quests/:id/complete` takes no amount. The server reads the quest's difficulty and awards it.
- Completion, XP ledger row, stats, daily activity and unlocks happen in one database transaction.
- `UNIQUE (quest_id, completed_on)` blocks a second reward for the same quest on the same day.
- SQL triggers reject any UPDATE or DELETE on `xp_transactions`.
- Level = derived from total XP. Cost to leave level L is `100 x L^2`.

## Daily training (Solo Leveling style)

Four exercise quests reset every day: push-ups, sit-ups, squats and a run. They start at beginner level
(10 reps, 1 km) and grow toward the famous 100 / 100 / 100 / 10 km goal. Tick each one when you finish it.

- Each target rises by 5 reps (or 0.5 km) after 5 normal-day sessions, and stops at the goal.
- Recovery and low-energy days halve the targets. XP stays the same, and those days do not count toward progression.
- The server owns the targets. The client cannot edit or lighten training quests.
- There is no death penalty and no punishment for missing a day.

## Recovery and sustainability

- Missing a day never costs XP. Overdue quests carry no penalty.
- Recovery mode and low-energy days count as active days, so the streak survives.
- "Lighten" lowers a quest one difficulty tier.

## API

All routes are under `/api`. Everything except register and login needs `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| POST | /auth/register, /auth/login | Create or log in a player |
| GET, PATCH | /player | Status, attributes, progress; rename |
| GET, POST | /quests | List (with completed-today) or create |
| PUT, DELETE | /quests/:id | Edit or soft-delete |
| POST | /quests/:id/complete | Award XP (server-side) |
| POST | /quests/:id/lighten | Reduce difficulty |
| POST | /recovery | Set mode: normal, recovery, low_energy |
| GET | /skills, /achievements, /notifications, /analytics, /xp | Read data |

## Known limits

- "Today" uses the server's local date. Run the server in your own time zone.
- The token is kept in localStorage. For a public deployment, move to httpOnly cookies and serve over HTTPS.
- SQLite suits one server. Move to Postgres if you need several.
