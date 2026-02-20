#!/usr/bin/env python3
"""
Batch resize, compress, and upload photos to Cloudflare R2.

Usage:
    python scripts/upload_photos.py --input-dir ./my-photos
    python scripts/upload_photos.py --input-dir ./my-photos --dry-run
    python scripts/upload_photos.py --input-dir ./my-photos --max-width 1600 --quality 85
"""

import argparse
import io
import os
import sys
from pathlib import Path

import boto3
from dotenv import load_dotenv
from pillow_heif import register_heif_opener
from PIL import Image, ImageOps

# Register HEIC/HEIF support so Pillow can open .heic files
register_heif_opener()

# Load .env from repo root (one level up from scripts/)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".dng", ".heic", ".tiff", ".tif"}
THUMB_WIDTH = 400
MAX_FILE_SIZE = 300 * 1024  # 300KB target


def get_r2_client():
    account_id = os.environ["R2_ACCOUNT_ID"]
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def normalize_filename(name):
    """Lowercase, replace spaces with hyphens."""
    return name.lower().replace(" ", "-")


def process_image(filepath, max_width, quality):
    """Open, orient, strip EXIF, resize, and compress an image. Returns JPEG bytes."""
    img = Image.open(filepath)
    img = ImageOps.exif_transpose(img)  # Auto-orient

    # Convert to RGB (handles PNG with alpha, RGBA, etc.)
    if img.mode != "RGB":
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "RGBA":
            background.paste(img, mask=img.split()[3])
        else:
            background.paste(img)
        img = background

    # Resize if wider than max_width
    if img.width > max_width:
        ratio = max_width / img.width
        new_size = (max_width, int(img.height * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    # Compress to JPEG, reducing quality if needed to hit size target
    buf = io.BytesIO()
    current_quality = quality
    while current_quality >= 40:
        buf.seek(0)
        buf.truncate()
        img.save(buf, format="JPEG", quality=current_quality, optimize=True)
        if buf.tell() <= MAX_FILE_SIZE or current_quality <= 40:
            break
        current_quality -= 5

    buf.seek(0)
    return buf, img.size, current_quality


def upload_to_r2(client, bucket, key, data):
    """Upload bytes to R2 with caching headers."""
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType="image/jpeg",
        CacheControl="public, max-age=31536000",
    )


def main():
    parser = argparse.ArgumentParser(description="Upload photos to Cloudflare R2")
    parser.add_argument("--input-dir", required=True, help="Folder of photos to upload")
    parser.add_argument("--max-width", type=int, default=1200, help="Max width in pixels (default: 1200)")
    parser.add_argument("--quality", type=int, default=80, help="JPEG quality 1-100 (default: 80)")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be uploaded without uploading")
    parser.add_argument("--no-thumbs", action="store_true", help="Skip thumbnail generation")
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.is_dir():
        print(f"Error: {input_dir} is not a directory")
        sys.exit(1)

    # Collect image files
    files = sorted(
        f for f in input_dir.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    if not files:
        print(f"No image files found in {input_dir}")
        sys.exit(0)

    print(f"Found {len(files)} image(s) in {input_dir}\n")

    bucket = os.environ.get("R2_BUCKET_NAME", "shino-photos")
    client = None if args.dry_run else get_r2_client()

    total_bytes = 0
    total_count = 0

    for filepath in files:
        original_size = filepath.stat().st_size
        key = normalize_filename(filepath.stem) + ".jpg"

        # Process full-size image
        buf, dimensions, final_quality = process_image(filepath, args.max_width, args.quality)
        file_size = buf.tell()
        buf.seek(0)

        print(f"  {filepath.name}")
        print(f"    → {key}  {dimensions[0]}x{dimensions[1]}  {file_size // 1024}KB  (q={final_quality})")

        if not args.dry_run:
            upload_to_r2(client, bucket, key, buf)
            print(f"    ✓ uploaded")

        total_bytes += file_size
        total_count += 1

        # Process thumbnail
        if not args.no_thumbs:
            thumb_key = normalize_filename(filepath.stem) + "-thumb.jpg"
            thumb_buf, thumb_dims, thumb_quality = process_image(filepath, THUMB_WIDTH, args.quality)
            thumb_size = thumb_buf.tell()
            thumb_buf.seek(0)

            print(f"    → {thumb_key}  {thumb_dims[0]}x{thumb_dims[1]}  {thumb_size // 1024}KB")

            if not args.dry_run:
                upload_to_r2(client, bucket, thumb_key, thumb_buf)
                print(f"    ✓ uploaded")

            total_bytes += thumb_size
            total_count += 1

        print()

    action = "Would upload" if args.dry_run else "Uploaded"
    print(f"{action} {total_count} file(s), {total_bytes / (1024 * 1024):.1f}MB total")

    if args.dry_run:
        print("\n(Dry run — nothing was uploaded. Remove --dry-run to upload.)")


if __name__ == "__main__":
    main()
