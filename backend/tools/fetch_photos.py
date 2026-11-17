"""Download the building photos listed in tools/photos.json from Wikimedia Commons.

    python tools/fetch_photos.py

Saves each photo to data/photos/<building>.jpg and fills in the
building's "photo", "photo_credit" and "photo_source" in data/buildings.json.
Every photo is freely licensed; the credit line on the end screen is what the
licence asks for, so keep it if you change anything.
"""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data" / "buildings.json"
# Kept with the backend, not in the public web folder, so the file names
# (which are building ids) can't give a photo-mode answer away.
PHOTO_DIR = HERE.parent / "data" / "photos"
# Wikimedia serves thumbnails at fixed widths; 960 is one of them.
WIDTH = 960
UA = {"User-Agent": "westerndle-photo-script/1.0"}


def download(file_name: str) -> bytes:
    url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(file_name)}?width={WIDTH}"
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(20 * (attempt + 1))  # rate limited: back off and retry
    raise RuntimeError(f"gave up on {file_name}")


def credit(p: dict) -> str:
    if p["licence"].lower().startswith("public domain"):
        return f"{p['author']}, public domain, via Wikimedia Commons"
    return f"{p['author']}, {p['licence']}, via Wikimedia Commons"


def main() -> None:
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    photos = json.loads((HERE / "photos.json").read_text())["photos"]
    doc = json.loads(DATA.read_text())
    by_id = {b["id"]: b for b in doc["buildings"]}

    for p in photos:
        target = PHOTO_DIR / f"{p['building']}.jpg"
        if not target.exists():
            target.write_bytes(download(p["file"]))
            print("downloaded", target.name)
            time.sleep(2)
        b = by_id[p["building"]]
        b["photo"] = target.name
        b["photo_credit"] = credit(p)
        b["photo_source"] = p["source"]

    DATA.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    print(f"{len(photos)} photos ready")


if __name__ == "__main__":
    main()
