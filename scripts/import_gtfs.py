#!/usr/bin/env python3
"""Import the latest Rīgas satiksme GTFS feed into the static frontend."""
from __future__ import annotations
import csv, hashlib, io, json, re, shutil, sys, tempfile, urllib.request, zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src" / "data" / "gtfs-data.ts"
PUBLIC_DATA = ROOT / "public" / "data" / "gtfs"
TIMETABLE_SHARDS = 32
DATASET_ID = "6d78358a-0095-4ce3-b119-6cde5d0ac54f"
CKAN_API = "https://data.gov.lv/dati/api/3/action/package_show?id=" + DATASET_ID
RESOURCE_RE = re.compile(r"marsrutusaraksti(\d{2})_(\d{4})\.zip$", re.I)
TABLES = ("stops.txt", "routes.txt", "trips.txt", "stop_times.txt", "calendar.txt", "calendar_dates.txt")

def read_csv(source, filename):
    if isinstance(source, zipfile.ZipFile):
        try: raw = source.read(filename)
        except KeyError: return []
        with io.TextIOWrapper(io.BytesIO(raw), encoding="utf-8-sig", newline="") as stream:
            return list(csv.DictReader(stream))
    path = source / filename
    if not path.exists(): return []
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))

def valid_float(value, minimum, maximum):
    try: number = float(value or "")
    except (TypeError, ValueError): return None
    return number if minimum <= number <= maximum else None

def download_latest_feed(destination):
    request = urllib.request.Request(CKAN_API, headers={"User-Agent": "RigaTransit/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=45) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not payload.get("success"):
        raise RuntimeError("Latvian Open Data Portal returned an unsuccessful dataset response.")
    candidates = []
    for resource in payload.get("result", {}).get("resources", []):
        name = (resource.get("name") or resource.get("url") or "").split("/")[-1]
        match = RESOURCE_RE.search(name)
        if match and resource.get("url"):
            candidates.append((int(match.group(2)), int(match.group(1)), resource["url"], name))
    if not candidates:
        raise RuntimeError("No monthly Rīgas satiksme GTFS ZIP resources were found.")
    year, month, url, name = max(candidates)
    request = urllib.request.Request(url, headers={"User-Agent": "RigaTransit/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response, destination.open("wb") as output:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk: break
            output.write(chunk)
    if not zipfile.is_zipfile(destination):
        destination.unlink(missing_ok=True)
        raise RuntimeError("Downloaded resource is not a valid ZIP archive.")
    return url

def load_feed(source, source_url=None):
    tables = {name: read_csv(source, name) for name in TABLES}
    route_names = {}
    for route in tables["routes.txt"]:
        route_id = route.get("route_id", "").strip()
        if route_id:
            route_names[route_id] = route.get("route_short_name", "").strip() or route.get("route_long_name", "").strip() or route_id
    trip_routes = {row.get("trip_id", "").strip(): row.get("route_id", "").strip()
                   for row in tables["trips.txt"] if row.get("trip_id") and row.get("route_id")}
    stop_routes = {}
    served_stop_ids = set()
    for row in tables["stop_times.txt"]:
        served_id = row.get("stop_id", "").strip()
        if served_id: served_stop_ids.add(served_id)
        stop_id = row.get("stop_id", "").strip()
        route_id = trip_routes.get(row.get("trip_id", "").strip())
        if stop_id and route_id in route_names:
            stop_routes.setdefault(stop_id, set()).add(route_names[route_id])
    stops, seen = [], set()
    for row in tables["stops.txt"]:
        stop_id, name = row.get("stop_id", "").strip(), row.get("stop_name", "").strip()
        lat, lon = valid_float(row.get("stop_lat"), -90, 90), valid_float(row.get("stop_lon"), -180, 180)
        location_type = (row.get("location_type") or "0").strip()
        # Keep only passenger boarding points used by actual trips; exclude parent stations.
        if location_type not in ("", "0"): continue
        if not stop_id or stop_id not in served_stop_ids or stop_id in seen or not name or lat is None or lon is None: continue
        seen.add(stop_id)
        stops.append({"id": stop_id, "name": name, "lat": lat, "lon": lon,
                      "routes": sorted(stop_routes.get(stop_id, set()),
                        key=lambda value: (not value.isdigit(), int(value) if value.isdigit() else value.casefold()))})
    stops.sort(key=lambda stop: (stop["name"].casefold(), stop["id"]))
    if not stops: raise ValueError("No valid stops found in stops.txt.")
    if not tables["routes.txt"] or not tables["trips.txt"] or not tables["stop_times.txt"]:
        raise ValueError("GTFS archive is incomplete: routes.txt, trips.txt and stop_times.txt are required.")
    metadata = {"source": "Rīgas satiksme GTFS", "sourceUrl": source_url,
      "importedAt": datetime.now(timezone.utc).date().isoformat(), "stopCount": len(stops),
      "routeCount": len(tables["routes.txt"]), "tripCount": len(tables["trips.txt"]),
      "stopTimeCount": len(tables["stop_times.txt"]), "license": "CC0 1.0"}
    compact = {"routes": tables["routes.txt"], "trips": tables["trips.txt"],
      "stop_times": tables["stop_times.txt"], "calendar": tables["calendar.txt"],
      "calendar_dates": tables["calendar_dates.txt"]}
    return stops, metadata, compact

def import_feed(source):
    stops, metadata, _ = load_feed(source)
    return stops, metadata

def timetable_shard(stop_id):
    digest = hashlib.sha1(stop_id.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % TIMETABLE_SHARDS


def build_timetable_data(tables):
    route_lookup = {}
    for route in tables["routes"]:
        route_id = route.get("route_id", "").strip()
        if not route_id:
            continue
        route_lookup[route_id] = [
            route.get("route_short_name", "").strip() or route_id,
            route.get("route_long_name", "").strip(),
            route.get("route_type", "").strip(),
        ]

    trip_lookup = {}
    for trip in tables["trips"]:
        trip_id = trip.get("trip_id", "").strip()
        route = route_lookup.get(trip.get("route_id", "").strip())
        if not trip_id or not route:
            continue
        trip_lookup[trip_id] = [
            trip.get("service_id", "").strip(),
            route[0], route[1], route[2],
            trip.get("trip_headsign", "").strip(),
            trip.get("direction_id", "").strip(),
        ]

    shards = {}
    index = {}
    for row in tables["stop_times"]:
        stop_id = row.get("stop_id", "").strip()
        trip = trip_lookup.get(row.get("trip_id", "").strip())
        departure = row.get("departure_time", "").strip() or row.get("arrival_time", "").strip()
        if not stop_id or not trip or not departure:
            continue
        shard = timetable_shard(stop_id)
        index[stop_id] = shard
        bucket = shards.setdefault(shard, {}).setdefault(stop_id, [])
        # Compact tuple: time, route number, route name, GTFS type, service, destination, direction.
        bucket.append([departure, trip[1], trip[2], trip[3], trip[0], trip[4], trip[5]])

    for stop_rows in shards.values():
        for rows in stop_rows.values():
            rows.sort(key=lambda item: item[0])
    return index, shards



def build_route_patterns(tables):
    """Build deduplicated route/direction stop sequences for on-demand route details."""
    route_lookup = {}
    for route in tables.get("routes", []):
        route_id = route.get("route_id", "").strip()
        if not route_id:
            continue
        route_lookup[route_id] = {
            "route": route.get("route_short_name", "").strip() or route_id,
            "routeName": route.get("route_long_name", "").strip(),
            "routeType": route.get("route_type", "").strip(),
        }

    trip_lookup = {}
    for trip in tables.get("trips", []):
        trip_id = trip.get("trip_id", "").strip()
        route = route_lookup.get(trip.get("route_id", "").strip())
        if not trip_id or not route:
            continue
        trip_lookup[trip_id] = {
            **route,
            "headsign": trip.get("trip_headsign", "").strip(),
            "directionId": trip.get("direction_id", "").strip(),
        }

    trip_stops = {}
    for row in tables.get("stop_times", []):
        trip_id = row.get("trip_id", "").strip()
        stop_id = row.get("stop_id", "").strip()
        if not trip_id or not stop_id or trip_id not in trip_lookup:
            continue
        try:
            sequence = int(row.get("stop_sequence", "0") or 0)
        except ValueError:
            sequence = 0
        trip_stops.setdefault(trip_id, []).append({"stopId": stop_id, "sequence": sequence})

    patterns = {}
    for trip_id, stops in trip_stops.items():
        meta = trip_lookup[trip_id]
        stops.sort(key=lambda item: item["sequence"])
        if not stops:
            continue
        key = (meta["route"], meta["headsign"], meta["directionId"])
        pattern_key = tuple(item["stopId"] for item in stops)
        bucket = patterns.setdefault(key, {})
        bucket.setdefault(pattern_key, {
            **meta,
            "stops": stops,
        })

    output = []
    for variants in patterns.values():
        output.extend(variants.values())
    output.sort(key=lambda item: (item["route"], item["directionId"], item["headsign"]))
    return output

def write_outputs(stops, metadata, tables):
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    (PUBLIC_DATA / "stops.json").write_text(json.dumps(stops, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    for name in ("routes", "calendar", "calendar_dates"):
        rows = tables.get(name, [])
        (PUBLIC_DATA / f"{name}.json").write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    index, shards = build_timetable_data(tables)
    route_patterns = build_route_patterns(tables)
    (PUBLIC_DATA / "route-patterns.json").write_text(json.dumps(route_patterns, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    timetable_dir = PUBLIC_DATA / "timetables"
    if timetable_dir.exists():
        shutil.rmtree(timetable_dir)
    timetable_dir.mkdir(parents=True, exist_ok=True)
    for shard in range(TIMETABLE_SHARDS):
        payload = shards.get(shard, {})
        (timetable_dir / f"{shard:02d}.json").write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    (PUBLIC_DATA / "timetable-index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    # Remove the previous monolithic files: the client loads only one small stop shard.
    for obsolete in ("stop_times.json", "trips.json"):
        (PUBLIC_DATA / obsolete).unlink(missing_ok=True)

    metadata["timetableShardCount"] = TIMETABLE_SHARDS
    metadata["timetableStopCount"] = len(index)
    (PUBLIC_DATA / "manifest.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    payload = json.dumps(stops, ensure_ascii=False, separators=(",", ":"))
    meta = json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))
    OUTPUT.write_text("import type { Stop } from './stops';\n\n" +
      f"export const officialStops: Stop[] = {payload};\nexport const gtfsMetadata = {meta};\n", encoding="utf-8")
    print(f"Imported {metadata['stopCount']} stops, {metadata['routeCount']} routes, {metadata['tripCount']} trips and {metadata['stopTimeCount']} stop times into {TIMETABLE_SHARDS} lazy timetable shards.")

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/import_gtfs.py <gtfs.zip|gtfs-directory|--latest>", file=sys.stderr); return 2
    if sys.argv[1] == "--latest":
        with tempfile.TemporaryDirectory(prefix="riga-gtfs-") as temp:
            archive_path = Path(temp) / "latest-gtfs.zip"
            source_url = download_latest_feed(archive_path)
            with zipfile.ZipFile(archive_path) as archive:
                stops, metadata, tables = load_feed(archive, source_url)
            write_outputs(stops, metadata, tables)
        return 0
    path = Path(sys.argv[1]).expanduser().resolve()
    if path.is_dir():
        stops, metadata, tables = load_feed(path)
    elif path.is_file() and zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive: stops, metadata, tables = load_feed(archive)
    else:
        print(f"Input is not a GTFS zip or directory: {path}", file=sys.stderr); return 2
    write_outputs(stops, metadata, tables); return 0

if __name__ == "__main__":
    try: raise SystemExit(main())
    except Exception as error:
        print(f"GTFS import failed: {error}", file=sys.stderr); raise SystemExit(1)
