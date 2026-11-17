"""Westerndle HTTP API (FastAPI).

The answer never reaches the browser before the game ends: guesses are scored
here, and the client only ever learns the answer by guessing it or by using
up all its guesses.
"""

from __future__ import annotations

import os
import random
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import select

from . import puzzle as pz
from . import photo as ph
from .db import DATA_FILE, PHOTO_DIR, BuildingRow, PlayRow, init_db, make_engine, play_stats, session_factory
from .game import Building, score_guess

MAX_GUESSES = 8
# The first-letter hint unlocks once this many guesses have missed.
HINT_AFTER = 5


# --- request bodies ---

# "daily" is the classic daily puzzle, "photo" the daily photo puzzle.
Mode = Literal["daily", "photo", "practice"]


class GuessIn(BaseModel):
    mode: Mode
    buildingId: str
    puzzle: int | None = None
    token: str | None = None

class RevealIn(BaseModel):
    mode: Mode
    guesses: int = Field(ge=0)
    puzzle: int | None = None
    token: str | None = None

class ResultIn(BaseModel):
    mode: Literal["daily", "photo"] = "daily"
    puzzle: int
    won: bool
    guesses: int = Field(ge=1, le=MAX_GUESSES)


def _secret() -> str:
    return os.environ.get("WESTERNDLE_SECRET", "dev-secret-change-me")


def _to_building(r: BuildingRow) -> Building:
    return Building(r.id, r.name, r.lat, r.lon, r.zone, r.category, r.year_built, r.floors)


def create_app(
    database_url: str | None = None,
    static_dir: Path | None = None,
    photo_dir: Path = PHOTO_DIR,
    data_file: Path = DATA_FILE,
) -> FastAPI:
    engine = make_engine(database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        init_db(engine, data_file)
        with session_factory(engine)() as s:
            app.state.buildings = {r.id: r for r in s.scalars(select(BuildingRow))}
        # Photos whose file is actually there; the end screen can show any of them.
        app.state.photo_ids = sorted(
            r.id for r in app.state.buildings.values() if r.photo and (photo_dir / r.photo).is_file()
        )
        # Photo mode needs enough pixels for its 5x close-ups to stay sharp.
        app.state.photo_mode_ids = [i for i in app.state.photo_ids if ph.width(photo_dir / app.state.buildings[i].photo) >= ph.MIN_WIDTH]
        yield
        engine.dispose()

    app = FastAPI(title="Westerndle API", lifespan=lifespan)
    Session = session_factory(engine)

    def buildings(request: Request) -> dict[str, BuildingRow]:
        return request.app.state.buildings

    def building_or_404(request: Request, building_id: str) -> BuildingRow:
        b = buildings(request).get(building_id)
        if b is None:
            raise HTTPException(404, f"unknown building '{building_id}'")
        return b

    def check_active(puzzle: int | None) -> int:
        if puzzle is None:
            raise HTTPException(422, "daily guesses need a puzzle number")
        today = pz.puzzle_number(pz.today_on_campus())
        # Allow yesterday's puzzle so a game started before midnight can finish.
        if puzzle not in (today, today - 1):
            raise HTTPException(409, "that puzzle is not active")
        return puzzle

    def photo_answer_id(request: Request, puzzle: int) -> str:
        ids = request.app.state.photo_mode_ids
        if not ids:
            raise HTTPException(404, "photo mode isn't available: no building photos are installed")
        # Its own schedule (a different seed), so it doesn't follow the classic puzzle's order.
        return pz.daily_answer_id(pz.date_for_puzzle(puzzle), ids, _secret() + ":photo")

    def photo_url(b: BuildingRow) -> str | None:
        return f"/api/photos/{b.id}" if b.photo and b.id in app.state.photo_ids else None

    def answer_for(request: Request, mode: str, puzzle: int | None, token: str | None) -> BuildingRow:
        if mode == "daily":
            puzzle = check_active(puzzle)
            answer_id = pz.daily_answer_id(pz.date_for_puzzle(puzzle), list(buildings(request)), _secret())
        elif mode == "photo":
            answer_id = photo_answer_id(request, check_active(puzzle))
        else:
            answer_id = pz.read_practice_token(token or "", _secret())
            if answer_id is None:
                raise HTTPException(400, "invalid practice token")
        return building_or_404(request, answer_id)

    # --- routes ---------------------------------------------------------------

    @app.get("/api/health")
    def health():
        return {"ok": True}

    @app.get("/api/buildings")
    def list_buildings(request: Request):
        """Names for the autocomplete. Attributes are only revealed by guessing."""
        rows = sorted(buildings(request).values(), key=lambda r: r.name)
        return [{"id": r.id, "name": r.name, "aliases": r.aliases} for r in rows]

    @app.get("/api/daily")
    def daily(request: Request):
        day = pz.today_on_campus()
        return {
            "puzzle": pz.puzzle_number(day),
            "date": day.isoformat(),
            "maxGuesses": MAX_GUESSES,
            "hintAfter": HINT_AFTER,
            "photoMode": bool(request.app.state.photo_mode_ids),
        }

    @app.post("/api/practice")
    def new_practice(request: Request):
        answer = random.choice(list(buildings(request)))
        return {"token": pz.make_practice_token(answer, _secret()), "maxGuesses": MAX_GUESSES, "hintAfter": HINT_AFTER}

    @app.post("/api/guess")
    def guess(body: GuessIn, request: Request):
        g = building_or_404(request, body.buildingId)
        answer = answer_for(request, body.mode, body.puzzle, body.token)
        result = score_guess(_to_building(g), _to_building(answer))
        # The guess's own position is public; the map on the end screen plots it.
        result.update(photo=photo_url(g), lat=g.lat, lon=g.lon)
        return result

    @app.post("/api/reveal")
    def reveal(body: RevealIn, request: Request):
        """The answer, once a player has used all their guesses."""
        if body.guesses < MAX_GUESSES:
            raise HTTPException(403, "keep guessing")
        a = answer_for(request, body.mode, body.puzzle, body.token)
        return {"id": a.id, "name": a.name, "lat": a.lat, "lon": a.lon, "photo": photo_url(a), "photoCredit": a.photo_credit, "photoSource": a.photo_source}

    @app.post("/api/hint")
    def hint(body: RevealIn, request: Request):
        """First letter of the answer, after HINT_AFTER misses."""
        if body.guesses < HINT_AFTER:
            raise HTTPException(403, f"the hint unlocks after {HINT_AFTER} guesses")
        a = answer_for(request, body.mode, body.puzzle, body.token)
        return {"firstLetter": a.name[0].upper()}

    @app.get("/api/photo/{puzzle}/{level}")
    def photo_view(puzzle: int, level: int, request: Request):
        """Today's photo-mode picture at a zoom level: 0 is the first view, MAX_GUESSES - 1 the whole photo.

        Like /api/reveal, this trusts the client about how many guesses it has made.
        """
        if not 0 <= level < MAX_GUESSES:
            raise HTTPException(422, f"level must be 0-{MAX_GUESSES - 1}")
        b = building_or_404(request, photo_answer_id(request, check_active(puzzle)))
        focus = tuple(b.photo_focus) if b.photo_focus else (0.5, 0.5)
        jpeg = ph.render(photo_dir / b.photo, level, MAX_GUESSES, focus)
        return Response(jpeg, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})

    @app.get("/api/photos/{building_id}")
    def full_photo(building_id: str, request: Request):
        """A building's whole photo, for the end-of-game card."""
        b = building_or_404(request, building_id)
        if building_id not in request.app.state.photo_ids:
            raise HTTPException(404, "no photo for that building")
        return FileResponse(photo_dir / b.photo, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=86400"})

    @app.post("/api/results", status_code=201)
    def record_result(body: ResultIn):
        check_active(body.puzzle)
        with Session() as s, s.begin():
            s.add(PlayRow(puzzle=body.puzzle, mode=body.mode, won=body.won, guesses=body.guesses))
        return {"ok": True}

    @app.get("/api/stats/{puzzle}")
    def stats(puzzle: int, mode: Literal["daily", "photo"] = "daily"):
        with Session() as s:
            return play_stats(s, puzzle, MAX_GUESSES, mode)

    # --- built frontend (production) -------------------------------------------
    static_dir = static_dir or Path(os.environ.get("WESTERNDLE_STATIC", Path(__file__).resolve().parents[2] / "frontend" / "dist"))
    if static_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str):
            f = (static_dir / path).resolve()
            if path and f.is_file() and static_dir.resolve() in f.parents:
                return FileResponse(f)
            return FileResponse(static_dir / "index.html")

    return app


app = create_app()
