#!/usr/bin/env python3
"""Check public R2 photos for capture-date metadata.

Run an audit:
    python3 scripts/audit_photo_privacy.py

Remove capture-date metadata from affected public JPEGs:
    python3 scripts/audit_photo_privacy.py --strip-capture-dates

Map locations remain available because they live in photos.csv, not in the
public image files.
"""

import argparse
import io
import os
import sys

from PIL import ExifTags, Image, ImageOps

from upload_photos import get_r2_client


DATE_TAG_NAMES = {"DateTime", "DateTimeOriginal", "DateTimeDigitized"}
DATE_MARKERS = (
    b"datetimeoriginal",
    b"datetimedigitized",
    b"createdate",
    b"modifydate",
    b"datecreated",
    b"xmp:createdate",
    b"photoshop:datecreated",
)
IMAGE_SUFFIXES = {".jpg", ".jpeg"}


def has_capture_date(image_bytes):
    """Return whether JPEG metadata exposes a capture or creation date."""
    with Image.open(io.BytesIO(image_bytes)) as image:
        exif = image.getexif()
        if any(
            ExifTags.TAGS.get(tag_id, str(tag_id)) in DATE_TAG_NAMES
            for tag_id in exif
        ):
            return True

    # Some cameras write XMP/IPTC date fields outside the standard EXIF block.
    lower_bytes = image_bytes.lower()
    return any(marker in lower_bytes for marker in DATE_MARKERS)


def strip_metadata(image_bytes):
    """Re-encode a JPEG without EXIF, XMP, IPTC, or embedded date metadata."""
    with Image.open(io.BytesIO(image_bytes)) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode != "RGB":
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "RGBA":
                background.paste(image, mask=image.getchannel("A"))
            else:
                background.paste(image)
            image = background

        output = io.BytesIO()
        image.save(output, format="JPEG", quality=95, optimize=True, progressive=True)
        return output.getvalue()


def list_image_objects(client, bucket):
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket):
        for item in page.get("Contents", []):
            key = item["Key"]
            if os.path.splitext(key)[1].lower() in IMAGE_SUFFIXES:
                yield key


def fetch_object(client, bucket, key):
    response = client.get_object(Bucket=bucket, Key=key)
    try:
        return response["Body"].read(), response.get("CacheControl")
    finally:
        response["Body"].close()


def main():
    parser = argparse.ArgumentParser(
        description="Audit public R2 images for capture-date metadata."
    )
    parser.add_argument(
        "--strip-capture-dates",
        action="store_true",
        help="Replace only affected public JPEGs with metadata-free copies",
    )
    args = parser.parse_args()

    bucket = os.environ.get("R2_BUCKET_NAME", "shino-photos")
    client = get_r2_client()
    affected = []
    checked = 0

    for key in list_image_objects(client, bucket):
        image_bytes, cache_control = fetch_object(client, bucket, key)
        checked += 1
        if not has_capture_date(image_bytes):
            continue

        affected.append(key)
        if args.strip_capture_dates:
            cleaned = strip_metadata(image_bytes)
            if has_capture_date(cleaned):
                raise RuntimeError(f"Metadata check failed after cleaning {key}")
            put_args = {
                "Bucket": bucket,
                "Key": key,
                "Body": cleaned,
                "ContentType": "image/jpeg",
            }
            if cache_control:
                put_args["CacheControl"] = cache_control
            client.put_object(**put_args)

    if affected:
        action = "Removed capture-date metadata from" if args.strip_capture_dates else "Found capture-date metadata in"
        print(f"{action} {len(affected)} of {checked} public JPEG(s):")
        for key in affected:
            print(f"  - {key}")
        if not args.strip_capture_dates:
            print("\nRun again with --strip-capture-dates to clean only these files.")
        return 0 if args.strip_capture_dates else 2

    print(f"Checked {checked} public JPEG(s): no capture-date metadata found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
