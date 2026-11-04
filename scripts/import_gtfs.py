#!/usr/bin/env python3
"""Import Rīgas satiksme GTFS stops into the Riga Transit frontend.

Usage:
  python3 scripts/import_gtfs.py /path/to/gtfs.zip
  python3 scripts/import_gtfs.py /path/to/unpacked-gtfs-directory
The script uses only Python's standard library and writes src/data/gtfs-data.ts.
"""
from __future__ import annotations

import csv
import io
import json
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src" / "data" / "gtfs-data.ts"


def read_csv(source: zipfile.ZipFile | Path, filename: str) -> list[dict[str, str]]:
    if isinstance(source, zipfile.ZipFile):
        try:
            raw = source.read(filename)
        except KeyError:
            return []
        stream = io.TextIOWrapper(io.BytesIO(raw), encoding="utf-8-sig", newline="")
        return list(csv.DictReader(stream))
    path = source / filename
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def valid_float(value: str | None, minimum: float, maximum: float) -> float | None:
    try:
        number = float(value or "")
    except (TypeError, ValueError):
        return None
    if not (minimum <= number <= maximum):
        return None
    return number


def import_feed(source: zipfile.ZipFile | Path) -> tuple[list[dict], dict]:
    route_rows = read_csv(source, "routes.txt")
    trip_rows = read_csv(source, "trips.txt")
    stop_time_rows = read_csv(source, "stop_times.txt")
    stop_rows = read_csv(source, "stops.txt")

    route_names: dict[str, str] = {}
    for route in route_rows:
        route_id = route.get("route_id", "").strip()
        short_name = route.get("route_short_name", "").strip()
        long_name = route.get("route_long_name", "").strip()
        if route_id:
            route_names[route_id] = short_name or long_name or route_id

    trip_routes = {
        trip.get("trip_id", "").strip(): trip.get("route_id", "").strip()
        for trip in trip_rows
        if trip.get("trip_id") and trip.get("route_id")
    }
    stop_routes: dict[str, set[str]] = {}
    for row in stop_time_rows:
        stop_id = row.get("stop_id", "").strip()
        route_id = trip_routes.get(row.get("trip_id", "").strip())
        if stop_id and route_id and route_id in route_names:
            stop_routes.setdefault(stop_id, set()).add(route_names[route_id])

    output: list[dict] = []
    seen: set[str] = set()
    for row in stop_rows:
        stop_id = row.get("stop_id", "").strip()
        name = row.get("stop_name", "").strip()
        lat = valid_float(row.get("stop_lat"), -90, 90)
        lon = valid_float(row.get("stop_lon"), -180, 180)
        if not stop_id or stop_id in seen or not name or lat is None or lon is None:
            continue
        # Keep parent station/platform relationships as published by the agency;
        # remove only obviously non-passenger records with no usable coordinates.
        seen.add(stop_id)
        output.append({
            "id": stop_id,
            "name": name,
            "lat": lat,
            "lon": lon,
            "routes": sorted(stop_routes.get(stop_id, set()), key=lambda value: (not value.isdigit(), int(value) if value.isdigit() else value.lower())),
        })

    output.sort(key=lambda stop: (stop["name"].casefold(), stop["id"]))
    if not output:
        raise ValueError("No valid stops found. Check that the input contains a valid GTFS stops.txt.")
    metadata = {
        "source": "Rīgas satiksme GTFS",
        "importedAt": datetime.now(timezone.utc).date().isoformat(),
        "stopCount": len(output),
        "routeCount": len(route_names),
        "license": "CC0 1.0",
    }
    return output, metadata


def write_typescript(stops: list[dict], metadata: dict) -> None:
    payload = json.dumps(stops, ensure_ascii=False, separators=(",", ":"))
    meta = json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))
    content = (
        "import type { Stop } from './stops';\n\n"
        f"export const officialStops: Stop[] = {payload};\n"
        f"export const gtfsMetadata = {meta};\n"
    )
    OUTPUT.write_text(content, encoding="utf-8")
    print(f"Wrote {len(stops)} stops and {metadata['routeCount']} routes to {OUTPUT}")


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/import_gtfs.py <gtfs.zip|gtfs-directory>", file=sys.stderr)
        return 2
    source_path = Path(sys.argv[1]).expanduser().resolve()
    if source_path.is_dir():
        source: zipfile.ZipFile | Path = source_path
        stops, metadata = import_feed(source)
    elif source_path.is_file() and zipfile.is_zipfile(source_path):
        with zipfile.ZipFile(source_path) as archive:
            stops, metadata = import_feed(archive)
    else:
        print(f"Input is not a GTFS zip or directory: {source_path}", file=sys.stderr)
        return 2
    write_typescript(stops, metadata)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
