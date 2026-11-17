# Westerndle

A daily "-dle" guessing game for **Western University** campus buildings. Every
day there's a new mystery building. Each guess shows how close you are: the
campus zone, the building type, the year it was built, how many floors it has,
and the distance and compass direction to the answer.

- **Daily mode**: one building per day, rolling over at midnight London, ON time. It tracks
  your streaks and win %, and shows how everyone else did.
- **Practice mode**: unlimited random buildings.
- **Hint**: after 5 misses you can reveal the answer's first letter.
- **Map**: the end screen maps the answer and all your guesses.
- **Share**: a spoiler-free emoji grid, Wordle-style.

*Fan-made. Not affiliated with or endorsed by Western University.*

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript (strict), Tailwind CSS 4, Leaflet, Vite, Vitest |
| Backend | Python 3.13, FastAPI, SQLAlchemy 2, Pydantic |
| Database | PostgreSQL 16 (SQLite works for quick local runs) |
| Testing | pytest (run against both SQLite and PostgreSQL), Vitest |
| Ops | Docker, Docker Compose, GitHub Actions CI |

### Design notes

- **The answer never reaches the browser early.** Guesses are scored on the
  server (`backend/app/game.py`). The browser only gets feedback, so you can't
  find the answer in devtools or the JS bundle.
- **Daily schedule.** The schedule is shuffled with a secret seed and has no
  repeats inside a cycle: every building comes up exactly once per cycle, and
  without `WESTERNDLE_SECRET` the order can't be predicted from the source
  (`backend/app/puzzle.py`).
- **Stateless practice games.** The answer travels with the client in an
  HMAC-signed, obfuscated token. The server stores nothing per game, and a
  token that has been tampered with is rejected.
- **Geometry.** Distance uses the haversine great-circle formula. Direction is
  the initial bearing, snapped to 8 compass points.
- **Global stats.** Finished daily games are stored in PostgreSQL and
  aggregated into a per-puzzle guess distribution.

## Run it

With Docker (PostgreSQL + app on http://localhost:8000):

```bash
docker compose up --build
```

Free hosting: the app runs on Render's free tier and the database on Neon's
free Postgres.

1. Create a project at [neon.com](https://neon.com) and copy its connection string.
2. In [Render](https://render.com), choose **New → Blueprint** and pick this repo
   (it reads `render.yaml`).
3. Paste the Neon connection string when Render asks for `DATABASE_URL`.

Render's free instance sleeps after 15 minutes without visitors, so the first
visit after that takes about a minute.

Local development (two terminals):

```bash
cd backend && pip install -r requirements-dev.txt && uvicorn app.main:app --reload
```

```bash
cd frontend && npm install && npm run dev
```

Without `DATABASE_URL` the backend uses a local SQLite file. Point it at
Postgres with `DATABASE_URL=postgresql://user:pass@host/db`.

Tests:

```bash
cd backend && pytest
```

```bash
cd frontend && npm test && npm run typecheck
```

## Editing the building list

All buildings live in `backend/data/buildings.json`. The server rebuilds its
buildings table from that file on every start, so editing the file is all it
takes.

- **Coordinates** come from OpenStreetMap. Each building names its OSM feature
  in `osm_name`, and `python tools/osm_sync.py --fetch` (run from `backend/`)
  re-downloads and updates them. **Zones** (Core / North / South) are worked
  out from position by the same script.
- **Floor counts** marked `"floors"` in a building's `verified` list are from
  OpenStreetMap too.
- **Years built**, and any floor count not marked verified, were written from
  memory. Check them against Western's facilities pages before launch.
- **Photos**: 17 freely licensed photos from Wikimedia Commons are listed in
  `tools/photos.json`. Run `python tools/fetch_photos.py` (from `backend/`) once
  to download them and fill in the credits. To add your own, put the image in
  `frontend/public/photos/` and set `"photo"`, `"photo_credit"` and
  `"photo_source"`. Use photos you took or ones with a free licence (e.g.
  Wikimedia Commons), and credit the photographer as the licence requires.
  A test fails if a photo is missing its credit.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/buildings` | Names and aliases for the autocomplete |
| GET | `/api/daily` | Today's puzzle number and the guess limit |
| POST | `/api/practice` | Start a practice game (returns a token) |
| POST | `/api/guess` | Score a guess |
| POST | `/api/hint` | First letter of the answer, after 5 guesses |
| POST | `/api/reveal` | Get the answer once all guesses are used |
| POST | `/api/results` | Record a finished daily game |
| GET | `/api/stats/{puzzle}` | Global results for one puzzle |
