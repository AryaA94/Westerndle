from app import puzzle as pz
from app.main import MAX_GUESSES


def today():
    return pz.puzzle_number(pz.today_on_campus())


def test_buildings_list_hides_attributes(client):
    r = client.get("/api/buildings")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 30
    assert set(data[0]) == {"id", "name", "aliases"}


def test_daily_meta(client):
    r = client.get("/api/daily").json()
    assert r["puzzle"] == today() and r["maxGuesses"] == MAX_GUESSES


def find_daily_answer(client):
    for b in client.get("/api/buildings").json():
        r = client.post("/api/guess", json={"mode": "daily", "puzzle": today(), "buildingId": b["id"]}).json()
        if r["correct"]:
            return b["id"]
    raise AssertionError("no building was correct")


def test_exactly_one_daily_answer(client):
    hits = [
        b["id"]
        for b in client.get("/api/buildings").json()
        if client.post("/api/guess", json={"mode": "daily", "puzzle": today(), "buildingId": b["id"]}).json()["correct"]
    ]
    assert len(hits) == 1


def test_guess_feedback_shape(client):
    r = client.post("/api/guess", json={"mode": "daily", "puzzle": today(), "buildingId": "uc"})
    assert r.status_code == 200
    body = r.json()
    for key in ("zone", "category", "yearBuilt", "floors", "distanceM", "direction", "proximity"):
        assert key in body


def test_unknown_building_404(client):
    r = client.post("/api/guess", json={"mode": "daily", "puzzle": today(), "buildingId": "nope"})
    assert r.status_code == 404


def test_inactive_puzzle_rejected(client):
    r = client.post("/api/guess", json={"mode": "daily", "puzzle": today() - 5, "buildingId": "uc"})
    assert r.status_code == 409


def test_reveal_requires_all_guesses(client):
    body = {"mode": "daily", "puzzle": today(), "guesses": MAX_GUESSES - 1}
    assert client.post("/api/reveal", json=body).status_code == 403
    body["guesses"] = MAX_GUESSES
    r = client.post("/api/reveal", json=body)
    assert r.status_code == 200 and r.json()["id"] == find_daily_answer(client)


def test_practice_flow(client):
    token = client.post("/api/practice").json()["token"]
    answer = client.post("/api/reveal", json={"mode": "practice", "token": token, "guesses": MAX_GUESSES}).json()["id"]
    r = client.post("/api/guess", json={"mode": "practice", "token": token, "buildingId": answer}).json()
    assert r["correct"]


def test_practice_bad_token(client):
    r = client.post("/api/guess", json={"mode": "practice", "token": "garbage", "buildingId": "uc"})
    assert r.status_code == 400


def test_results_and_stats(client):
    p = today()
    for won, guesses in [(True, 3), (True, 3), (True, 5), (False, MAX_GUESSES)]:
        assert client.post("/api/results", json={"puzzle": p, "won": won, "guesses": guesses}).status_code == 201
    s = client.get(f"/api/stats/{p}").json()
    assert s["plays"] == 4 and s["wins"] == 3
    assert s["distribution"][2] == 2 and s["distribution"][4] == 1


def test_results_validation(client):
    assert client.post("/api/results", json={"puzzle": today(), "won": True, "guesses": 0}).status_code == 422
    assert client.post("/api/results", json={"puzzle": today(), "won": True, "guesses": MAX_GUESSES + 1}).status_code == 422


def test_hint_unlocks_after_enough_guesses(client):
    from app.main import HINT_AFTER

    body = {"mode": "daily", "puzzle": today(), "guesses": HINT_AFTER - 1}
    assert client.post("/api/hint", json=body).status_code == 403
    body["guesses"] = HINT_AFTER
    letter = client.post("/api/hint", json=body).json()["firstLetter"]
    names = {b["id"]: b["name"] for b in client.get("/api/buildings").json()}
    assert names[find_daily_answer(client)][0].upper() == letter


def test_guess_includes_guess_position(client):
    r = client.post("/api/guess", json={"mode": "daily", "puzzle": today(), "buildingId": "uc"}).json()
    assert isinstance(r["lat"], float) and isinstance(r["lon"], float)


def test_clues_unlock_with_guesses(client):
    from app.main import CLUES

    answer = find_daily_answer(client)
    body = {"mode": "daily", "puzzle": today(), "guesses": 0}
    first = client.post("/api/clues", json=body).json()
    assert [c["key"] for c in first] == [k for _, k, _ in CLUES]
    assert first[0]["value"] is not None  # the starting clue is free
    assert all(c["value"] is None for c in first[1:])  # later ones stay hidden

    body["guesses"] = 4
    unlocked = {c["key"]: c["value"] for c in client.post("/api/clues", json=body).json()}
    b = next(x for x in client.app.state.buildings.values() if x.id == answer)
    assert unlocked == {"category": b.category, "zone": unlocked["zone"], "decade": f"{b.year_built // 10 * 10}s"}
    assert unlocked["zone"]


def test_clues_work_in_practice(client):
    token = client.post("/api/practice").json()["token"]
    r = client.post("/api/clues", json={"mode": "practice", "token": token, "guesses": 0})
    assert r.status_code == 200 and r.json()[0]["value"]


def test_streak_rounds_have_fewer_guesses(client):
    from app.main import STREAK_GUESSES

    r = client.post("/api/practice", json={"mode": "streak"}).json()
    assert r["maxGuesses"] == STREAK_GUESSES
    body = {"mode": "streak", "token": r["token"], "guesses": STREAK_GUESSES - 1}
    assert client.post("/api/reveal", json=body).status_code == 403
    body["guesses"] = STREAK_GUESSES
    assert client.post("/api/reveal", json=body).status_code == 200


def test_streak_skips_excluded_buildings(client):
    ids = [b["id"] for b in client.get("/api/buildings").json()]
    keep = ids[0]
    for _ in range(5):
        token = client.post("/api/practice", json={"mode": "streak", "exclude": ids[1:]}).json()["token"]
        answer = client.post("/api/reveal", json={"mode": "streak", "token": token, "guesses": 6}).json()["id"]
        assert answer == keep


def test_streak_starts_over_when_everything_is_excluded(client):
    ids = [b["id"] for b in client.get("/api/buildings").json()]
    assert client.post("/api/practice", json={"mode": "streak", "exclude": ids}).status_code == 200


def test_practice_still_works_without_a_body(client):
    assert client.post("/api/practice").json()["maxGuesses"] == 8


def test_yesterday_reveals_the_previous_answer(client):
    from app.main import _secret

    y = client.get("/api/yesterday").json()
    assert y["puzzle"] == today() - 1
    ids = [b["id"] for b in client.get("/api/buildings").json()]
    assert y["id"] == pz.daily_answer_id(pz.date_for_puzzle(today() - 1), ids, _secret())
    assert y["name"]


def test_endless_clues_come_one_per_miss(client):
    token = client.post("/api/practice", json={"mode": "streak"}).json()["token"]
    for made, unlocked in [(0, 1), (1, 2), (2, 3)]:
        clues = client.post("/api/clues", json={"mode": "streak", "token": token, "guesses": made}).json()
        assert sum(c["value"] is not None for c in clues) == unlocked


def test_endless_has_no_first_letter_hint(client):
    r = client.post("/api/practice", json={"mode": "streak"}).json()
    assert r["hintAfter"] is None
    body = {"mode": "streak", "token": r["token"], "guesses": 10}
    assert client.post("/api/hint", json=body).status_code == 403


def _answer(c):
    return c.post("/api/reveal", json={"mode": "daily", "puzzle": today(), "guesses": 8}).json()["id"]


def test_todays_answer_survives_a_change_to_the_building_list(tmp_path):
    """Adding a building used to reshuffle the schedule, changing today's answer mid-game."""
    import json

    from fastapi.testclient import TestClient

    from app.db import DATA_FILE
    from app.main import create_app

    db = f"sqlite:///{tmp_path}/t.db"
    kw = dict(static_dir=tmp_path / "none", photo_dir=tmp_path / "none")
    with TestClient(create_app(db, **kw)) as c:
        before = _answer(c)

    doc = json.loads(DATA_FILE.read_text())
    doc["buildings"].append({**doc["buildings"][0], "id": "zzz", "name": "A New Building"})
    bigger = tmp_path / "bigger.json"
    bigger.write_text(json.dumps(doc))
    with TestClient(create_app(db, data_file=bigger, **kw)) as c:
        assert _answer(c) == before

    # If today's answer is removed from the list, a new one is picked rather than crashing.
    doc["buildings"] = [b for b in doc["buildings"] if b["id"] != before]
    smaller = tmp_path / "smaller.json"
    smaller.write_text(json.dumps(doc))
    with TestClient(create_app(db, data_file=smaller, **kw)) as c:
        assert _answer(c) != before


def test_unknown_api_path_is_404_not_the_web_page(tmp_path):
    from fastapi.testclient import TestClient

    from app.main import create_app

    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>app</html>")
    with TestClient(create_app(f"sqlite:///{tmp_path}/t.db", static_dir=dist, photo_dir=tmp_path)) as c:
        assert c.get("/api/showcase").status_code == 404
        assert c.get("/").text == "<html>app</html>"
        assert c.get("/some/page").text == "<html>app</html>"  # the app's own routes still load
