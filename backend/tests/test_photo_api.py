"""Photo mode through the HTTP API, using three made-up photos."""

import io
import json

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import puzzle as pz
from app.db import DATA_FILE
from app.main import MAX_GUESSES, create_app

WITH_PHOTOS = {"uc", "mc", "wl"}
TOO_SMALL = "ssc"  # has a photo, but too narrow for photo mode
OPTED_OUT = "pab"  # has a big enough photo, but is marked photo_mode: false


def today():
    return pz.puzzle_number(pz.today_on_campus())


@pytest.fixture()
def photo_client(tmp_path):
    doc = json.loads(DATA_FILE.read_text())
    for b in doc["buildings"]:
        b.pop("photo", None)
        if b["id"] in WITH_PHOTOS:
            b["photo"] = f"{b['id']}.jpg"
            Image.new("RGB", (1200, 900), "purple").save(tmp_path / b["photo"])
        if b["id"] == OPTED_OUT:
            b["photo"], b["photo_mode"] = "optout.jpg", False
            Image.new("RGB", (1200, 900), "grey").save(tmp_path / "optout.jpg")
        if b["id"] == TOO_SMALL:
            b["photo"] = "small.jpg"
            Image.new("RGB", (400, 300), "grey").save(tmp_path / "small.jpg")
    doc["buildings"].append({**doc["buildings"][0], "id": "nofile", "name": "Photo Missing", "photo": "nofile.jpg"})
    data = tmp_path / "buildings.json"
    data.write_text(json.dumps(doc))
    app = create_app(f"sqlite:///{tmp_path}/t.db", static_dir=tmp_path / "none", photo_dir=tmp_path, data_file=data)
    with TestClient(app) as c:
        yield c


def photo_answer(c):
    for bid in WITH_PHOTOS:
        r = c.post("/api/guess", json={"mode": "photo", "puzzle": today(), "buildingId": bid}).json()
        if r["correct"]:
            return bid
    raise AssertionError("photo answer isn't one of the buildings with a photo")


def test_daily_meta_reports_photo_mode(photo_client, client):
    assert photo_client.get("/api/daily").json()["photoMode"] is True
    # The default test app has no photo files installed.
    assert client.get("/api/daily").json()["photoMode"] is False


def test_photo_answer_only_uses_buildings_with_a_photo_file(photo_client):
    assert photo_answer(photo_client) in WITH_PHOTOS


def test_small_photo_shows_on_end_screen_but_not_in_photo_mode(photo_client):
    assert photo_client.get(f"/api/photos/{TOO_SMALL}").status_code == 200
    assert TOO_SMALL not in photo_client.app.state.photo_mode_ids


def test_photo_marked_off_stays_out_of_photo_mode(photo_client):
    assert photo_client.get(f"/api/photos/{OPTED_OUT}").status_code == 200
    assert OPTED_OUT not in photo_client.app.state.photo_mode_ids


def test_photo_views_are_jpegs_for_every_level(photo_client):
    for level in (0, MAX_GUESSES - 1):
        r = photo_client.get(f"/api/photo/{today()}/{level}")
        assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg"
        assert Image.open(io.BytesIO(r.content)).format == "JPEG"


def test_photo_view_rejects_bad_level_and_old_puzzle(photo_client):
    assert photo_client.get(f"/api/photo/{today()}/{MAX_GUESSES}").status_code == 422
    assert photo_client.get(f"/api/photo/{today() - 5}/0").status_code == 409


def test_photo_mode_unavailable_without_photos(client):
    assert client.get(f"/api/photo/{today()}/0").status_code == 404


def test_reveal_gives_the_full_photo_url(photo_client):
    body = {"mode": "photo", "puzzle": today(), "guesses": MAX_GUESSES}
    a = photo_client.post("/api/reveal", json=body).json()
    assert a["photo"] == f"/api/photos/{a['id']}"
    assert photo_client.get(a["photo"]).status_code == 200


def test_full_photo_404_for_building_without_one(photo_client):
    assert photo_client.get("/api/photos/smh").status_code == 404
    assert photo_client.get("/api/photos/nofile").status_code == 404


def test_stats_are_kept_per_mode(photo_client):
    p = today()
    photo_client.post("/api/results", json={"puzzle": p, "won": True, "guesses": 2, "mode": "photo"})
    photo_client.post("/api/results", json={"puzzle": p, "won": True, "guesses": 4})
    assert photo_client.get(f"/api/stats/{p}?mode=photo").json()["distribution"][1] == 1
    assert photo_client.get(f"/api/stats/{p}").json()["distribution"][3] == 1
    assert photo_client.get(f"/api/stats/{p}").json()["plays"] == 1

