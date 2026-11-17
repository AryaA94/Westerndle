"""Sanity checks on data/buildings.json, so a bad edit fails CI instead of the game."""

import json
from pathlib import Path

from app.db import DATA_FILE, PHOTO_DIR, BuildingRow, init_db, make_engine
from sqlalchemy import select
from sqlalchemy.orm import Session

BUILDINGS = json.loads(DATA_FILE.read_text())["buildings"]
ZONES = {"Core", "North", "South", "Residence", "Affiliate"}


def test_ids_and_names_unique():
    assert len({b["id"] for b in BUILDINGS}) == len(BUILDINGS)
    assert len({b["name"] for b in BUILDINGS}) == len(BUILDINGS)


def test_fields_are_sane():
    for b in BUILDINGS:
        assert 42.99 < b["lat"] < 43.03 and -81.30 < b["lon"] < -81.25, b["id"]
        assert b["zone"] in ZONES, b["id"]
        assert 1870 <= b["year_built"] <= 2030, b["id"]
        assert 1 <= b["floors"] <= 30, b["id"]


def test_photos_exist_and_are_credited():
    for b in BUILDINGS:
        if b.get("photo"):
            assert (PHOTO_DIR / b["photo"]).is_file(), f"{b['id']}: missing {b['photo']}"
            assert b.get("photo_credit"), f"{b['id']}: photo needs a photo_credit"
            assert b.get("photo_source", "").startswith("https://"), f"{b['id']}: photo needs a photo_source link"


def test_photo_manifest_matches_buildings():
    manifest = json.loads((DATA_FILE.parent.parent / "tools" / "photos.json").read_text())["photos"]
    ids = {b["id"] for b in BUILDINGS}
    for p in manifest:
        assert p["building"] in ids, p["building"]
        assert p["author"] and p["licence"] and p["source"].startswith("https://commons.wikimedia.org/"), p


def test_removed_buildings_leave_the_database(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path}/t.db")
    init_db(engine)
    small = tmp_path / "small.json"
    small.write_text(json.dumps({"buildings": BUILDINGS[:3]}))
    init_db(engine, small)
    with Session(engine) as s:
        assert {r.id for r in s.scalars(select(BuildingRow))} == {b["id"] for b in BUILDINGS[:3]}


def test_restart_keeps_player_results(tmp_path):
    from app.db import PlayRow

    engine = make_engine(f"sqlite:///{tmp_path}/t.db")
    init_db(engine)
    with Session(engine) as s, s.begin():
        s.add(PlayRow(puzzle=1, won=True, guesses=3))
    init_db(engine)  # what happens on every server start
    with Session(engine) as s:
        assert s.scalar(select(PlayRow.guesses)) == 3


def test_old_plays_table_gets_a_mode_column(tmp_path):
    """A database from before photo mode: plays has no mode column yet."""
    from sqlalchemy import inspect, text

    engine = make_engine(f"sqlite:///{tmp_path}/old.db")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE plays (id INTEGER PRIMARY KEY, puzzle INTEGER, won BOOLEAN, guesses INTEGER, created_at TIMESTAMP)"))
        conn.execute(text("INSERT INTO plays (puzzle, won, guesses) VALUES (5, 1, 3)"))
    init_db(engine)
    assert "mode" in {c["name"] for c in inspect(engine).get_columns("plays")}
    with engine.connect() as conn:
        assert conn.execute(text("SELECT mode, guesses FROM plays")).one() == ("daily", 3)
