#!/usr/bin/env python3
"""
Upload pre-converted JPEG photos and thumbnails to Cloudflare R2.

These files were converted from HEIC/JPG originals and are ready to upload.

Usage:
    1. Create a .env file in the repo root with:
       R2_ACCOUNT_ID=your_account_id
       R2_ACCESS_KEY_ID=your_access_key
       R2_SECRET_ACCESS_KEY=your_secret_key
       R2_BUCKET_NAME=shino-photos

    2. Run: python scripts/upload_converted.py
       Or dry run: python scripts/upload_converted.py --dry-run
"""

import os
import sys
from pathlib import Path

import boto3
from dotenv import load_dotenv

# Load .env from repo root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

FULL_DIR = Path("/tmp/photo-conversion/full")
THUMB_DIR = Path("/tmp/photo-conversion/thumb")


def get_r2_client():
    account_id = os.environ["R2_ACCOUNT_ID"]
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def upload_file(client, bucket, key, filepath):
    with open(filepath, "rb") as f:
        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=f,
            ContentType="image/jpeg",
            CacheControl="public, max-age=31536000",
        )


def main():
    dry_run = "--dry-run" in sys.argv

    if not FULL_DIR.exists() or not THUMB_DIR.exists():
        print("Error: Converted files not found at /tmp/photo-conversion/")
        print("The converted files may have been cleaned up. Re-run the conversion.")
        sys.exit(1)

    bucket = os.environ.get("R2_BUCKET_NAME", "shino-photos")
    client = None if dry_run else get_r2_client()

    full_files = sorted(FULL_DIR.glob("*.jpg"))
    thumb_files = sorted(THUMB_DIR.glob("*.jpg"))

    print(f"Found {len(full_files)} full images, {len(thumb_files)} thumbnails\n")

    total = 0
    for f in full_files:
        size_kb = f.stat().st_size / 1024
        print(f"  {f.name} ({size_kb:.0f}KB)")
        if not dry_run:
            upload_file(client, bucket, f.name, f)
            print(f"    ✓ uploaded")
        total += 1

    for f in thumb_files:
        size_kb = f.stat().st_size / 1024
        print(f"  {f.name} ({size_kb:.0f}KB)")
        if not dry_run:
            upload_file(client, bucket, f.name, f)
            print(f"    ✓ uploaded")
        total += 1

    action = "Would upload" if dry_run else "Uploaded"
    print(f"\n{action} {total} files")
    if dry_run:
        print("(Dry run — remove --dry-run to upload)")


if __name__ == "__main__":
    main()
