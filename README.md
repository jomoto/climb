# climb

## Add photos to the climbing map

For a new trip, place the original photos in one folder and run:

```bash
scripts/add-photos --input-dir "/path/to/new-trip"
```

This is a preview: it creates no uploads or map changes. It shows the title,
location, image size, and filename that each new pin will use. Every photo
needs GPS metadata; for a single photo without it, add `--coordinates LAT,LON`.

When the preview looks right, publish the photo pair and map pins with:

```bash
scripts/add-photos --input-dir "/path/to/new-trip" --publish
```

The script creates a compressed `name.jpg`, a `name-thumb.jpg` for the map card,
uploads both without overwriting existing files, and appends the matching pin to
`photos.csv`. After that, publish the website so the new pins appear online.

The public files do not include the date or GPS metadata from the original
photos. GPS is retained separately in `photos.csv` for the map pins. To audit
the existing public bucket for capture-date metadata, run:

```bash
scripts/check-photo-privacy
```

One-time setup: install `scripts/requirements.txt`, then copy `.env.example` to
`.env` and add the private Cloudflare R2 upload credentials. Never commit `.env`.

## Source control
This project is already initialized as a Git repository. To finish setting it up for your own account, add a remote and push:

```bash
git remote add origin <your-repo-url>
git push -u origin work
```

To save changes going forward:

```bash
git add -A
git commit -m "Describe your change"
git push
```
