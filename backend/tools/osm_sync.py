"""Update building coordinates (and floor counts, where tagged) from OpenStreetMap.

    python tools/osm_sync.py --fetch     # download a fresh snapshot, then update
    python tools/osm_sync.py             # update from the saved snapshot

Each building in data/buildings.json names its OpenStreetMap feature in "osm_name".
Zones are worked out from position, so they stay consistent when coordinates change.
"""

from __future__ import annotations

import argparse
import json
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SNAPSHOT = HERE / "osm_snapshot.json"
DATA = HERE.parent / "data" / "buildings.json"

# Main campus bounding box (south, west, north, east).
BBOX = (42.998, -81.292, 43.020, -81.258)
QUERY = (
    "[out:json][timeout:60];"
    '(way["building"]["name"]({0},{1},{2},{3});relation["building"]["name"]({0},{1},{2},{3}););'
    "out center tags;"
).format(*BBOX)

# Latitude lines that split main campus into zones.
NORTH_OF = 43.0100
SOUTH_OF = 43.0065


def fetch() -> None:
    body = urllib.parse.urlencode({"data": QUERY}).encode()
    req = urllib.request.Request(
        "https://overpass-api.de/api/interpreter", data=body, headers={"User-Agent": "westerndle-data-script/1.0"}
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        SNAPSHOT.write_bytes(r.read())


def zone_for(b: dict) -> str:
    if b["category"] == "Residence":
        return "Residence"
    if b.get("affiliate"):
        return "Affiliate"
    if b["lat"] > NORTH_OF:
        return "North"
    if b["lat"] < SOUTH_OF:
        return "South"
    return "Core"


def sync() -> list[str]:
    osm: dict[str, list[dict]] = {}
    for e in json.loads(SNAPSHOT.read_text())["elements"]:
        osm.setdefault(e["tags"]["name"], []).append(e)

    doc = json.loads(DATA.read_text())
    problems = []
    for b in doc["buildings"]:
        names = b["osm_name"] if isinstance(b["osm_name"], list) else [b["osm_name"]]
        found = [e for n in names for e in osm.get(n, [])]
        if not found:
            problems.append(f"{b['id']}: no OSM building named {names}")
            continue
        # A building split into several OSM shapes (e.g. Medway + Sydenham) uses their midpoint.
        b["lat"] = round(sum(e["center"]["lat"] for e in found) / len(found), 5)
        b["lon"] = round(sum(e["center"]["lon"] for e in found) / len(found), 5)
        levels = found[0]["tags"].get("building:levels")
        if levels and levels.isdigit():
            b["floors"] = int(levels)
            b.setdefault("verified", [])
            if "floors" not in b["verified"]:
                b["verified"].append("floors")
        b["zone"] = zone_for(b)
    DATA.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    return problems


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fetch", action="store_true", help="download a fresh snapshot first")
    args = ap.parse_args()
    if args.fetch:
        fetch()
    for p in sync():
        print("WARNING:", p)
    print(f"updated {DATA}")
