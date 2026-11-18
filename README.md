# Westerndle

A daily "-dle" guessing game for **Western University** campus buildings. Every
day there's a new mystery building. Each guess shows how close you are: the
campus zone, the building type, the year it was built, how many floors it has,
and the distance and compass direction to the answer.

- **Daily mode**: one building per day, rolling over at midnight London, ON time. It tracks
  your streaks and win %, and shows how everyone else did.
- **📷 Photo mode**: a second daily puzzle that starts on a blurry close-up of
  a building and zooms out with every wrong guess.
- **🔥 Endless mode**: buildings back to back with 6 guesses each, no repeats
  within a run. One miss ends the run; your best streak is saved.
- **Clues**: the building's type is shown from the start; its zone unlocks
  after 2 misses, the decade it was built after 4, and its first letter after 5.
- **Map**: the end screen maps the answer and all your guesses.
- **Share**: a spoiler-free emoji grid, Wordle-style.

*Fan-made. Not affiliated with or endorsed by Western University.*

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript (strict), Tailwind CSS 4, Leaflet, Vite, Vitest |
| Backend | Python 3.13, FastAPI, SQLAlchemy 2, Pydantic, Pillow |
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
- **Stateless endless rounds.** The answer travels with the client in an
  HMAC-signed, obfuscated token. The server stores nothing per game, and a
  token that has been tampered with is rejected.
- **Geometry.** Distance uses the haversine great-circle formula. Direction is
  the initial bearing, snapped to 8 compass points.
- **Photo crops are made on the server.** Pillow cuts each zoom level out of
  the photo (`backend/app/photo.py`), so the full picture never reaches the
  browser before the game ends. Photos live in `backend/data/photos`, not the
  public web folder, because their file names would give the answer away.
- **Global stats.** Finished daily games are stored in PostgreSQL and
  aggregated into a per-puzzle guess distribution.

## Put it online (free)

The app runs on [Render](https://render.com)'s free tier and the database on
[Neon](https://neon.com)'s free Postgres. Neither needs a credit card.

1. **Neon:** create a project and copy its connection string (it starts with
   `postgresql://`). Keep it private: it's the database password.
2. **Render:** choose **New → Blueprint** and pick this repo. Render reads
   `render.yaml` and sets everything up.
3. When Render asks for `DATABASE_URL`, paste the Neon connection string, then
   deploy.

Render's free instance sleeps after 15 minutes without visitors, so the first
visit after that takes about a minute to load.

## Run it on your computer

**With Docker** (starts PostgreSQL and the app together):

```bash
docker compose up --build
```

Then open http://localhost:8000.

**Without Docker**, run the backend and frontend in two terminals:

```bash
cd backend && pip install -r requirements-dev.txt && uvicorn app.main:app --reload
```

```bash
cd frontend && npm install && npm run dev
```

Then open the address the frontend prints (usually http://localhost:5173).
This uses a local SQLite file instead of PostgreSQL, so you don't need to
install a database. To use PostgreSQL, set
`DATABASE_URL=postgresql://user:pass@host/db` before starting the backend.

## Run the tests

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
- **Photos** are freely licensed, from Wikimedia Commons, and listed with
  their credits in `tools/photos.json`. `python tools/fetch_photos.py` (from
  `backend/`) downloads any that are missing into `backend/data/photos`. To add
  your own, put the image there and set `"photo"` (the file name),
  `"photo_credit"` and `"photo_source"`. Photo mode only uses buildings that
  have a photo. Use photos you took or ones with a free licence (e.g.
  Wikimedia Commons), and credit the photographer as the licence requires.
  A test fails if a photo is missing its credit.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/buildings` | Names and aliases for the autocomplete |
| GET | `/api/daily` | Today's puzzle number and the guess limit |
| POST | `/api/practice` | Start an endless or practice round (returns a token) |
| GET | `/api/showcase` | Photos for the menu (never today's answers) |
| POST | `/api/guess` | Score a guess |
| POST | `/api/clues` | Free clues unlocked so far |
| POST | `/api/hint` | First letter of the answer, after 5 guesses |
| POST | `/api/reveal` | Get the answer once all guesses are used |
| GET | `/api/photo/{puzzle}/{level}` | Photo-mode picture at a zoom level |
| GET | `/api/photos/{id}` | A building's full photo (end screen) |
| POST | `/api/results` | Record a finished daily game |
| GET | `/api/stats/{puzzle}` | Global results for one puzzle |
