#!/usr/bin/env python3
"""Prepare, upload, and map a folder of new climbing photographs.

Start with a safe preview:
    python3 scripts/add_photos.py --input-dir "/path/to/new-trip"

After reviewing the proposed map pins, publish them:
    python3 scripts/add_photos.py --input-dir "/path/to/new-trip" --publish

The script requires GPS metadata in every photograph. For a single photograph
without GPS, supply its pin directly:
    python3 scripts/add_photos.py --input-dir "/path/to/photo" --coordinates 37.742645,-119.535888 --publish
"""

import argparse
import csv
import os
import sys
from pathlib import Path

from botocore.exceptions import ClientError

from generate_csv import get_gps
from upload_photos import (
    SUPPORTED_EXTENSIONS,
    THUMB_WIDTH,
    get_r2_client,
    normalize_filename,
    process_image,
    upload_to_r2,
)


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CSV_PATH = REPOSITORY_ROOT / "photos.csv"


def parse_coordinates(value):
    try:
        latitude, longitude = (float(part.strip()) for part in value.split(",", 1))
    except ValueError as error:
        raise argparse.ArgumentTypeError("Coordinates must be latitude,longitude") from error

    return validate_coordinates(latitude, longitude)


def validate_coordinates(latitude, longitude):
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise argparse.ArgumentTypeError("Coordinates are outside valid latitude/longitude ranges")
    return latitude, longitude


def display_title(filepath, explicit_title):
    if explicit_title:
        return explicit_title
    return filepath.stem.replace("-", " ").replace("_", " ").title()


def read_existing_filenames(csv_path):
    if not csv_path.exists():
        raise FileNotFoundError(f"Map data not found: {csv_path}")

    with csv_path.open(newline="", encoding="utf-8") as file:
        return {row.get("photo_filename", "") for row in csv.DictReader(file)}


def read_locations(locations_path):
    """Read optional filename,title,lat,lon overrides for photos without GPS."""
    with locations_path.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        expected = {"filename", "lat", "lon"}
        if not reader.fieldnames or not expected.issubset(reader.fieldnames):
            raise ValueError("Locations file needs filename,lat,lon columns (title is optional)")

        locations = {}
        for row in reader:
            filename = (row.get("filename") or "").strip()
            if not filename:
                raise ValueError("Every locations row needs a filename")
            try:
                coordinates = validate_coordinates(float(row["lat"]), float(row["lon"]))
            except (TypeError, ValueError, argparse.ArgumentTypeError) as error:
                raise ValueError(f"Invalid coordinates for {filename}") from error
            key = filename.casefold()
            if key in locations:
                raise ValueError(f"Locations file lists {filename} more than once")
            locations[key] = {"coordinates": coordinates, "title": (row.get("title") or "").strip()}
    return locations


def object_exists(client, bucket, key):
    try:
        client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as error:
        status = str(error.response.get("Error", {}).get("Code", ""))
        if status in {"404", "NoSuchKey", "NotFound"}:
            return False
        raise


def build_entries(
    input_dir,
    existing_filenames,
    coordinates,
    explicit_title,
    manual_locations,
    only_listed,
    max_width,
    quality,
):
    files = sorted(
        filepath
        for filepath in input_dir.iterdir()
        if filepath.is_file() and filepath.suffix.lower() in SUPPORTED_EXTENSIONS
    )
    if not files:
        raise ValueError(f"No supported image files found in {input_dir}")
    input_filenames = {filepath.name.casefold() for filepath in files}
    unknown_locations = set(manual_locations) - input_filenames
    if unknown_locations:
        raise ValueError("Locations file does not match a photo: " + sorted(unknown_locations)[0])
    if only_listed:
        if not manual_locations:
            raise ValueError("--only-listed requires --locations")
        files = [filepath for filepath in files if filepath.name.casefold() in manual_locations]
        if not files:
            raise ValueError("None of the photos match the locations file")
    if explicit_title and len(files) != 1:
        raise ValueError("--title can only be used when adding one photograph")
    if coordinates and len(files) != 1:
        raise ValueError("--coordinates can only be used when adding one photograph")

    entries = []
    seen_filenames = set()
    missing_gps = []

    for filepath in files:
        filename = normalize_filename(filepath.stem) + ".jpg"
        thumbnail = filename.replace(".jpg", "-thumb.jpg")
        if filename in seen_filenames:
            raise ValueError(f"Two files would produce the same name: {filename}")
        if filename in existing_filenames:
            raise ValueError(f"A map entry already uses {filename}; rename the new file before continuing")

        manual_location = manual_locations.get(filepath.name.casefold())
        gps = manual_location["coordinates"] if manual_location else coordinates or get_gps(filepath)
        if not gps:
            missing_gps.append(filepath.name)
            continue

        full_image, dimensions, full_quality = process_image(filepath, max_width, quality)
        thumbnail_image, thumbnail_dimensions, thumbnail_quality = process_image(
            filepath, THUMB_WIDTH, quality
        )
        entries.append(
            {
                "source": filepath,
                "title": display_title(filepath, explicit_title or (manual_location or {}).get("title")),
                "latitude": gps[0],
                "longitude": gps[1],
                "filename": filename,
                "thumbnail": thumbnail,
                "full_image": full_image,
                "thumbnail_image": thumbnail_image,
                "dimensions": dimensions,
                "thumbnail_dimensions": thumbnail_dimensions,
                "full_quality": full_quality,
                "thumbnail_quality": thumbnail_quality,
            }
        )
        seen_filenames.add(filename)

    if missing_gps:
        names = "\n  - ".join(missing_gps)
        raise ValueError(
            "These photos have no GPS location:\n  - "
            + names
            + "\nAdd location metadata, or add one photo at a time with --coordinates LAT,LON."
        )
    return entries


def print_preview(entries):
    print(f"\nReady to add {len(entries)} photo(s):\n")
    for entry in entries:
        full_size = entry["full_image"].getbuffer().nbytes // 1024
        thumb_size = entry["thumbnail_image"].getbuffer().nbytes // 1024
        print(f"  {entry['title']}")
        print(f"    pin: {entry['latitude']:.6f}, {entry['longitude']:.6f}")
        print(
            f"    full: {entry['filename']}  {entry['dimensions'][0]}x{entry['dimensions'][1]} "
            f"{full_size}KB (q={entry['full_quality']})"
        )
        print(
            f"    thumb: {entry['thumbnail']}  "
            f"{entry['thumbnail_dimensions'][0]}x{entry['thumbnail_dimensions'][1]} "
            f"{thumb_size}KB (q={entry['thumbnail_quality']})"
        )


def append_map_entries(csv_path, entries):
    with csv_path.open("a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=["title", "lat", "lon", "photo_filename"])
        for entry in entries:
            writer.writerow(
                {
                    "title": entry["title"],
                    "lat": f"{entry['latitude']:.6f}",
                    "lon": f"{entry['longitude']:.6f}",
                    "photo_filename": entry["filename"],
                }
            )


def main():
    parser = argparse.ArgumentParser(
        description="Add a folder of photos to the climbing map and Cloudflare R2."
    )
    parser.add_argument("--input-dir", required=True, help="Folder containing the new photos")
    parser.add_argument("--publish", action="store_true", help="Upload files and append map pins")
    parser.add_argument("--coordinates", type=parse_coordinates, help="Manual latitude,longitude for one photo")
    parser.add_argument("--title", help="Custom title for one photo")
    parser.add_argument("--locations", type=Path, help="CSV overrides with filename,title,lat,lon for photos without GPS")
    parser.add_argument("--only-listed", action="store_true", help="Add only photos named in --locations")
    parser.add_argument("--max-width", type=int, default=1200, help="Full image width (default: 1200)")
    parser.add_argument("--quality", type=int, default=80, help="JPEG quality (default: 80)")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV_PATH, help="Map CSV path")
    args = parser.parse_args()

    input_dir = Path(args.input_dir).expanduser()
    if not input_dir.is_dir():
        parser.error(f"Not a folder: {input_dir}")
    if args.max_width < 400:
        parser.error("--max-width must be at least 400")
    if not 1 <= args.quality <= 100:
        parser.error("--quality must be between 1 and 100")

    try:
        manual_locations = read_locations(args.locations) if args.locations else {}
        entries = build_entries(
            input_dir,
            read_existing_filenames(args.csv),
            args.coordinates,
            args.title,
            manual_locations,
            args.only_listed,
            args.max_width,
            args.quality,
        )
    except (FileNotFoundError, ValueError) as error:
        parser.error(str(error))

    print_preview(entries)
    if not args.publish:
        print("\nPreview only — nothing was uploaded or changed.")
        print("When the titles and pins look right, rerun with --publish.")
        return

    bucket = os.environ.get("R2_BUCKET_NAME", "shino-photos")
    try:
        client = get_r2_client()
        occupied = [
            key
            for entry in entries
            for key in (entry["filename"], entry["thumbnail"])
            if object_exists(client, bucket, key)
        ]
    except KeyError as error:
        parser.error(
            f"Missing {error.args[0]} in .env. Copy .env.example to .env and add the private R2 credentials."
        )

    if occupied:
        parser.error("Refusing to overwrite existing R2 file(s): " + ", ".join(occupied))

    for entry in entries:
        entry["full_image"].seek(0)
        entry["thumbnail_image"].seek(0)
        upload_to_r2(client, bucket, entry["filename"], entry["full_image"])
        upload_to_r2(client, bucket, entry["thumbnail"], entry["thumbnail_image"])

    append_map_entries(args.csv, entries)
    print(f"\nUploaded {len(entries)} photo(s) and added their pins to {args.csv}.")
    print("Publish the website change when you are ready for the pins to go live.")


if __name__ == "__main__":
    main()
