import csv
import tempfile
import unittest
import zipfile
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import import_gtfs
from import_gtfs import import_feed


class GtfsImportTests(unittest.TestCase):
    def test_maps_route_names_to_stops_and_skips_bad_coordinates(self):
        with tempfile.TemporaryDirectory() as temp:
            archive_path = Path(temp) / "feed.zip"
            tables = {
                "routes.txt": "route_id,route_short_name,route_long_name\nr1,3,Route 3\n",
                "trips.txt": "route_id,service_id,trip_id\nr1,s1,t1\n",
                "stop_times.txt": "trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt1,08:00:00,08:00:00,s1,1\n",
                "stops.txt": "stop_id,stop_name,stop_lat,stop_lon,location_type\ns1,Centrs,56.95,24.10,0\ns2,Bad,,24.1,0\ns3,Far East,56.0,120.0,0\ns4,Station,56.951,24.101,1\ns5,Unused,56.952,24.102,0\n",
            }
            with zipfile.ZipFile(archive_path, "w") as archive:
                for name, value in tables.items():
                    archive.writestr(name, value)
            with zipfile.ZipFile(archive_path) as archive:
                stops, metadata = import_feed(archive)
            self.assertEqual(len(stops), 1)
            self.assertEqual(stops[0]["routes"], ["3"])
            self.assertEqual(metadata["stopCount"], 1)
            self.assertEqual(metadata["routeCount"], 1)

    def test_empty_feed_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive_path = Path(temp) / "empty.zip"
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr("stops.txt", "stop_id,stop_name,stop_lat,stop_lon\n")
            with zipfile.ZipFile(archive_path) as archive:
                with self.assertRaises(ValueError):
                    import_feed(archive)


    def test_builds_lazy_stop_timetable_shards(self):
        tables = {
            "routes": [{"route_id": "r1", "route_short_name": "3", "route_long_name": "Daugavgrīva - Pļavnieki", "route_type": "3"}],
            "trips": [{"trip_id": "t1", "route_id": "r1", "service_id": "weekday", "trip_headsign": "Pļavnieki", "direction_id": "0"}],
            "stop_times": [
                {"trip_id": "t1", "stop_id": "s1", "departure_time": "08:10:00"},
                {"trip_id": "t1", "stop_id": "s1", "departure_time": "08:00:00"},
            ],
        }
        index, shards = import_gtfs.build_timetable_data(tables)
        shard = index["s1"]
        self.assertEqual(shard, import_gtfs.timetable_shard("s1"))
        self.assertEqual(shards[shard]["s1"][0],
            ["08:00:00", "3", "Daugavgrīva - Pļavnieki", "3", "weekday", "Pļavnieki", "0"])

    def test_builds_deduplicated_route_stop_patterns(self):
        tables = {
            "routes": [{"route_id": "r1", "route_short_name": "3", "route_long_name": "Route 3", "route_type": "3"}],
            "trips": [
                {"trip_id": "t1", "route_id": "r1", "trip_headsign": "Center", "direction_id": "0"},
                {"trip_id": "t2", "route_id": "r1", "trip_headsign": "Center", "direction_id": "0"},
            ],
            "stop_times": [
                {"trip_id": "t1", "stop_id": "s2", "stop_sequence": "2"},
                {"trip_id": "t1", "stop_id": "s1", "stop_sequence": "1"},
                {"trip_id": "t2", "stop_id": "s1", "stop_sequence": "1"},
                {"trip_id": "t2", "stop_id": "s2", "stop_sequence": "2"},
            ],
        }
        patterns = import_gtfs.build_route_patterns(tables)
        self.assertEqual(len(patterns), 1)
        self.assertEqual([item["stopId"] for item in patterns[0]["stops"]], ["s1", "s2"])
        self.assertEqual(patterns[0]["headsign"], "Center")

    def test_write_outputs_omits_monolithic_stop_times(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            old_public, old_output = import_gtfs.PUBLIC_DATA, import_gtfs.OUTPUT
            try:
                import_gtfs.PUBLIC_DATA = root / "public" / "gtfs"
                import_gtfs.OUTPUT = root / "src" / "gtfs-data.ts"
                import_gtfs.OUTPUT.parent.mkdir(parents=True)
                tables = {
                    "routes": [{"route_id": "r1", "route_short_name": "3", "route_long_name": "Route 3", "route_type": "3"}],
                    "trips": [{"trip_id": "t1", "route_id": "r1", "service_id": "weekday", "trip_headsign": "Center", "direction_id": "0"}],
                    "stop_times": [{"trip_id": "t1", "stop_id": "s1", "departure_time": "08:00:00"}],
                    "calendar": [], "calendar_dates": [],
                }
                metadata = {"stopCount": 1, "routeCount": 1, "tripCount": 1, "stopTimeCount": 1}
                import_gtfs.write_outputs([{"id": "s1", "name": "Center", "lat": 56.9, "lon": 24.1}], metadata, tables)
                self.assertTrue((import_gtfs.PUBLIC_DATA / "timetable-index.json").exists())
                self.assertTrue((import_gtfs.PUBLIC_DATA / "timetables" / f"{import_gtfs.timetable_shard('s1'):02d}.json").exists())
                self.assertFalse((import_gtfs.PUBLIC_DATA / "stop_times.json").exists())
                self.assertFalse((import_gtfs.PUBLIC_DATA / "trips.json").exists())
                self.assertEqual(metadata["timetableStopCount"], 1)
            finally:
                import_gtfs.PUBLIC_DATA, import_gtfs.OUTPUT = old_public, old_output


if __name__ == "__main__":
    unittest.main()
