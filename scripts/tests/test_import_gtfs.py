import csv
import tempfile
import unittest
import zipfile
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
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


if __name__ == "__main__":
    unittest.main()
