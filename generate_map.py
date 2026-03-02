import csv
import re

import folium
from folium.plugins import MarkerCluster


CSV_FILE_PATH = "ticks.csv"
OUTPUT_MAP_PATH = "map.html"

STATE_EXCLUDES_ALL_AREAS = {
    "Alaska",
    "Oklahoma",
    "Arkansas",
    "Tennessee",
    "Georgia",
    "Virginia",
    "West Virginia",
    "Ohio",
    "Indiana",
    "Illinois",
    "Missouri",
    "Wisconsin",
    "Michigan",
    "Minnesota",
}

EXACT_SEGMENT_EXCLUDES = {
    "q'emiln park",
    "q’emiln park",
    "northwest region",
    "southwest region",
    "portland & the gorge",
    "sawtooth range",
    "wichita mountains wildlife refuge",
    "austin area",
    "tulsa area",
    "boulder",
    "laramie area",
    "lander area",
    "grand junction area",
}

US_STATES = {
    "alabama",
    "alaska",
    "arizona",
    "arkansas",
    "california",
    "colorado",
    "connecticut",
    "delaware",
    "florida",
    "georgia",
    "hawaii",
    "idaho",
    "illinois",
    "indiana",
    "iowa",
    "kansas",
    "kentucky",
    "louisiana",
    "maine",
    "maryland",
    "massachusetts",
    "michigan",
    "minnesota",
    "mississippi",
    "missouri",
    "montana",
    "nebraska",
    "nevada",
    "new hampshire",
    "new jersey",
    "new mexico",
    "new york",
    "north carolina",
    "north dakota",
    "ohio",
    "oklahoma",
    "oregon",
    "pennsylvania",
    "rhode island",
    "south carolina",
    "south dakota",
    "tennessee",
    "texas",
    "utah",
    "vermont",
    "virginia",
    "washington",
    "west virginia",
    "wisconsin",
    "wyoming",
}

BROAD_PREFIXES = (
    "north",
    "south",
    "northern",
    "southern",
    "central",
)

KNOWN_PLAIN_BROAD_SEGMENTS = {
    f"{prefix} {state}" for prefix in BROAD_PREFIXES for state in US_STATES
}


def normalize_segment(segment: str) -> str:
    return re.sub(r"\s+", " ", (segment or "").replace("’", "'").strip().lower())


def should_keep_segment(segment: str) -> bool:
    normalized = normalize_segment(segment)
    no_parens = re.sub(r"\([^)]*\)", "", normalized).strip()

    if no_parens in KNOWN_PLAIN_BROAD_SEGMENTS:
        return False

    if no_parens in EXACT_SEGMENT_EXCLUDES:
        return False

    return True


def should_keep_row(row: dict[str, str]) -> bool:
    location = (row.get("Location") or "").strip()
    if not location:
        return False

    parts = [part.strip() for part in location.split(">")]
    state = parts[0]
    if state in STATE_EXCLUDES_ALL_AREAS:
        return False

    sawtooth_parts = False
    elephant_perch = False
    for part in parts:
        normalized = normalize_segment(part)
        if no_parens := re.sub(r"\([^)]*\)", "", normalized).strip():
            if no_parens == "the sawtooth range":
                sawtooth_parts = True
            if "elephant's perch" in no_parens:
                elephant_perch = True
            if not should_keep_segment(part):
                return False

    # Keep only Sawtooth routes that are on The Elephant's Perch.
    if sawtooth_parts and not elephant_perch:
        return False

    return True


def parse_coordinates(raw: str) -> tuple[float, float]:
    lat, lon = (value.strip() for value in raw.split(","))
    return float(lat), float(lon)


print("Loading CSV.")
location_dict: dict[tuple[float, float], list[folium.Marker]] = {}
seen_route_keys: set[tuple[str, str, tuple[float, float]]] = set()

with open(CSV_FILE_PATH, newline="", encoding="utf-8") as csv_file:
    reader = csv.DictReader(csv_file)
    for idx, row in enumerate(reader, start=2):
        if not should_keep_row(row):
            continue

        try:
            date = row["Date"]
            route_name = row["Route"]
            rating = row["Rating"]
            notes = (row.get("Notes") or "").strip()
            url = row["URL"]
            pitches = row.get("Pitches", "").strip()
            location = parse_coordinates(row["Lat and long"])

            route_key = (date, route_name, location)
            if route_key in seen_route_keys:
                continue
            seen_route_keys.add(route_key)

            popup_html = f"""
            <div style="width: 250px;">
                <b>Date:</b> {date}<br>
                <b>Route:</b> <a href="{url}" target="_blank">{route_name}</a><br>
                <b>Rating:</b> {rating}<br>
                <b>Pitches:</b> {pitches}<br>
                {f"<b>Notes:</b> {notes}" if notes else ""}
            </div>
            """

            print(f"Processing route: {route_name} at location: {location}")

            marker = folium.Marker(location=location, popup=popup_html)
            if location not in location_dict:
                location_dict[location] = []
            location_dict[location].append(marker)
        except Exception as e:
            print(f"Error processing route {route_name}: {e}")
            continue

center_location = [37.5, -119.5]
mymap = folium.Map(location=center_location, zoom_start=6)
print("Map initialized.")

for location, markers in location_dict.items():
    try:
        if len(markers) > 1:
            marker_cluster = MarkerCluster(spiderfy_on_max_zoom=True).add_to(mymap)
            for marker in markers:
                marker.add_to(marker_cluster)
        else:
            markers[0].add_to(mymap)
    except Exception as e:
        print(f"Error adding markers to the map for location {location}: {e}")

try:
    mymap.save(OUTPUT_MAP_PATH)
    print(f"Map saved successfully as '{OUTPUT_MAP_PATH}'.")
except Exception as e:
    print(f"Error saving the map: {e}")
