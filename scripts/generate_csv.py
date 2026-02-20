#!/usr/bin/env python3
"""
Scan a folder of photos, extract GPS coordinates from EXIF, and generate photos.csv.

Usage:
    python scripts/generate_csv.py --input-dir assets/images
    python scripts/generate_csv.py --input-dir assets/images --output photos.csv

Supports: JPG, JPEG, PNG, DNG, HEIC, TIFF, WEBP

The generated CSV has columns: title, lat, lon, photo_filename
- title: derived from the filename (capitalized, hyphens/underscores become spaces)
- lat/lon: extracted from EXIF GPS data (blank if no GPS)
- photo_filename: normalized filename (lowercase, hyphens) with .jpg extension
"""

import argparse
import csv
import subprocess
import sys
from pathlib import Path

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".dng", ".heic", ".tiff", ".tif", ".webp"}


def normalize_filename(name):
    """Lowercase, replace spaces with hyphens."""
    return name.lower().replace(" ", "-")


def get_gps_via_mdls(filepath):
    """Use macOS mdls to extract GPS coordinates (works with all formats including DNG/HEIC)."""
    try:
        result = subprocess.run(
            ["mdls", "-name", "kMDItemLatitude", "-name", "kMDItemLongitude", str(filepath)],
            capture_output=True,
            text=True,
            timeout=10,
        )
        lat = None
        lon = None
        for line in result.stdout.split("\n"):
            if "kMDItemLatitude" in line and "(null)" not in line:
                lat = float(line.split("=")[1].strip())
            if "kMDItemLongitude" in line and "(null)" not in line:
                lon = float(line.split("=")[1].strip())
        if lat is not None and lon is not None:
            return lat, lon
    except Exception:
        pass
    return None


def get_gps_via_pillow(filepath):
    """Fallback: use Pillow for JPG/PNG EXIF GPS extraction."""
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS

        img = Image.open(filepath)
        exif = img._getexif()
        if not exif:
            return None
        for tag, val in exif.items():
            if TAGS.get(tag) == "GPSInfo":
                gps = {GPSTAGS.get(t, t): v for t, v in val.items()}

                def to_deg(v):
                    return float(v[0]) + float(v[1]) / 60 + float(v[2]) / 3600

                lat = to_deg(gps["GPSLatitude"])
                lon = to_deg(gps["GPSLongitude"])
                if gps.get("GPSLatitudeRef") == "S":
                    lat = -lat
                if gps.get("GPSLongitudeRef") == "W":
                    lon = -lon
                return lat, lon
    except Exception:
        pass
    return None


def get_gps(filepath):
    """Try mdls first (macOS, handles all formats), then fall back to Pillow."""
    result = get_gps_via_mdls(filepath)
    if result:
        return result
    return get_gps_via_pillow(filepath)


def main():
    parser = argparse.ArgumentParser(description="Generate photos.csv from image EXIF data")
    parser.add_argument("--input-dir", required=True, help="Folder of photos to scan")
    parser.add_argument("--output", default="photos.csv", help="Output CSV path (default: photos.csv)")
    parser.add_argument("--append", action="store_true", help="Append to existing CSV instead of overwriting")
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.is_dir():
        print(f"Error: {input_dir} is not a directory")
        sys.exit(1)

    # Collect image files
    files = sorted(
        f
        for f in input_dir.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    if not files:
        print(f"No image files found in {input_dir}")
        sys.exit(0)

    # If appending, read existing filenames to skip duplicates
    existing_filenames = set()
    if args.append:
        output_path = Path(args.output)
        if output_path.exists():
            with open(output_path, "r", newline="") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    existing_filenames.add(row.get("photo_filename", ""))

    print(f"Scanning {len(files)} image(s) in {input_dir}...\n")

    rows = []
    no_gps_count = 0

    for filepath in files:
        photo_filename = normalize_filename(filepath.stem) + ".jpg"

        if photo_filename in existing_filenames:
            print(f"  {filepath.name} → skipped (already in CSV)")
            continue

        gps = get_gps(filepath)

        if gps:
            lat, lon = gps
            print(f"  {filepath.name} → {photo_filename}  ({lat:.6f}, {lon:.6f})")
        else:
            lat, lon = "", ""
            no_gps_count += 1
            print(f"  {filepath.name} → {photo_filename}  (NO GPS — fill in manually)")

        rows.append(
            {
                "title": filepath.stem.replace("-", " ").replace("_", " ").title(),
                "lat": f"{lat:.6f}" if isinstance(lat, float) else "",
                "lon": f"{lon:.6f}" if isinstance(lon, float) else "",
                "photo_filename": photo_filename,
            }
        )

    if not rows:
        print("\nNo new photos to add.")
        return

    # Write CSV
    output_path = Path(args.output)
    mode = "a" if args.append and output_path.exists() else "w"
    write_header = mode == "w" or not output_path.exists()

    with open(output_path, mode, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["title", "lat", "lon", "photo_filename"])
        if write_header:
            writer.writeheader()
        writer.writerows(rows)

    print(f"\n{'Appended' if args.append else 'Wrote'} {len(rows)} row(s) to {args.output}")
    if no_gps_count:
        print(f"⚠  {no_gps_count} photo(s) had no GPS data — fill in lat/lon manually")
    print(f"\nNext steps:")
    print(f"  1. Review titles in {args.output} (edit if needed)")
    print(f"  2. Fill in any missing lat/lon values")
    print(f"  3. Run: python scripts/upload_photos.py --input-dir {input_dir}")


if __name__ == "__main__":
    main()
