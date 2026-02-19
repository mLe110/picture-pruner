# Features — Picture Pruner

## F1: Photo Import

Import photos from a local directory into the application database. Extracts metadata (filename, file size, dimensions, EXIF data where available) and stores references in PostgreSQL. Does not copy or move the original files.

**Input**: Directory of image files (JPEG, PNG, HEIC) — any filesystem path
**Output**: Database records for each imported photo

### Project-scoped import

Photos are organized under **projects**. Each project points to an arbitrary filesystem directory (e.g., `/Users/you/Photos/Philippines/`). No requirement to copy files into the repository.

### Auto-sync on page load

Every time a project page is opened, the app diffs the filesystem against the database:

- **New files** (on disk, not in DB) are inserted with `status: "unreviewed"` and `fileExists: true`
- **Removed files** (in DB, not on disk) have `fileExists` set to `false` — review status is preserved
- **Re-appeared files** (in DB with `fileExists: false`, back on disk) have `fileExists` set back to `true`

A manual **Sync** button in the project header can also trigger a sync at any time.

### Deterministic photo IDs

Photo IDs are deterministic UUIDs derived from `projectId + fileName`, ensuring uniqueness across projects and consistent IDs across re-scans.

---

## F2: Exact Duplicate Detection

Identify photos that are byte-for-byte identical using content hashing (SHA-256). These are photos uploaded multiple times to the shared collection.

### Content hashing

During sync, every photo file is hashed using SHA-256 via streaming reads (no full-file memory loading). The resulting 64-character hex hash is stored in the `photos.hash` column. A composite index on `(projectId, hash)` enables efficient duplicate lookups.

### Duplicates API

`GET /api/projects/[projectId]/duplicates` returns a `DuplicateGroupsResponse`:

- Groups photos by matching hash within the project (only `fileExists: true` photos)
- Each group contains 2+ photos that share the same content hash
- Response includes `totalDuplicatePhotos` count

### Duplicates UI

The project page includes a **Browse / Duplicates** toggle (using `ToggleGroup`). When "Duplicates" is selected:

- Duplicate groups are fetched from the API and displayed as bordered cards
- Each card shows a badge with photo count and truncated hash
- **"Keep first, discard rest"** button for one-click resolution per group
- Individual photo cards support the same status actions as browse view
- Resolved groups (all photos marked keep/discard) are dimmed
- Lightbox remains available — status changes are shared between views

---

## F3: Similar Photo Detection

Identify photos that are visually similar but not identical — e.g., burst shots, slight reframes, resolution variants, or compression differences.

### Algorithm: dHash (Difference Hash)

Perceptual hashing via dHash produces a 64-bit fingerprint for each image:

1. Resize image to 9x8 grayscale using `sharp`
2. For each of the 8 rows, compare 8 adjacent pixel pairs (left > right = 1, else 0)
3. Produces a 64-bit fingerprint stored as a 16-char hex string in `photos.perceptual_hash`

The perceptual hash is computed during photo sync alongside the SHA-256 content hash. If `sharp` cannot process an image, the photo is still imported without a perceptual hash.

### Similarity grouping

Photos are grouped using **Hamming distance** between perceptual hashes with a **Union-Find** algorithm:

- Two photos are considered similar if their Hamming distance is ≤ threshold (default: 10 out of 64 bits)
- Union-Find ensures transitivity: if A~B and B~C, then A, B, C are in the same group
- O(n²) pairwise comparison, but fast (bitwise ops on 64-bit values)

### Similar photos API

`GET /api/projects/[projectId]/similar?threshold=10` returns a `SimilarGroupsResponseSchema`:

- Groups photos by perceptual similarity within the project (only `fileExists: true` photos with a perceptual hash)
- Each group contains 2+ visually similar photos with a `groupId`
- Response includes `totalSimilarPhotos` count
- Optional `threshold` query parameter overrides the default Hamming distance threshold

### Similar photos UI

The project page includes a **Browse / Duplicates / Similar** tab bar. When "Similar" is selected:

- Similar groups are fetched from the API and displayed as bordered cards
- Each card shows a badge with photo count and group number
- **"Keep first, discard rest"** button for one-click resolution per group
- Individual photo cards support the same status actions as browse view
- Resolved groups (all photos marked keep/discard) are dimmed
- Lightbox remains available — status changes are shared between views

---

## F4: Photo Review UI

Web-based interface for reviewing and curating photos.

- Browse all imported photos within a project
- View duplicate/similar groups side-by-side
- Select which photos to keep from each group
- Mark individual photos as "keep", "discard", or "maybe"
- Filter by: all, unreviewed, keep, maybe, discard

### Project navigation

- **Project list** (`/projects`) — shows all projects with photo count and unreviewed count
- **Create project dialog** — enter project name and input directory path
- **Project page** (`/projects/[projectId]`) — auto-syncs on load, renders the photo browser
- **Breadcrumb navigation** — header shows project name with link back to project list

### Photo grid and cards

- Responsive CSS grid with auto-fill, 220px minimum card width
- 1:1 center-cropped thumbnails with hover overlay for keep/maybe/discard actions
- Status badges: green ring for keep, amber ring for maybe, dimmed + grayscale for discard
- "File removed" indicator: dashed border, broken-image icon, dimmed card when `fileExists` is false

### Lightbox

- Full-size photo dialog with prev/next navigation
- Metadata row (filename, dimensions, file size, taken date)
- Keep, Maybe, and Discard buttons
- "File no longer on disk" placeholder when file is removed

### Keyboard shortcuts

- Arrow keys for navigation
- `K` for keep
- `M` for maybe
- `D` for discard
- Escape to close

### Status toggle

- Clicking keep/maybe/discard when already that status resets to unreviewed
- Setting a status auto-advances to the next photo in the lightbox

### File removed indicator

When a file disappears from disk, the photo shows a "File removed" overlay with a broken-image icon. Status buttons remain functional (user can still mark as discard to clean up). The review status is preserved.

### Persistence

All review states are persisted to PostgreSQL. Status changes are applied optimistically in the UI with API persistence via `PATCH /api/projects/[projectId]/photos/[photoId]`.

### Manual sync

A **Sync** button in the project header triggers `POST /api/projects/[projectId]/sync` — shows spinner during sync, displays result summary (X added, Y removed, Z restored), then refreshes the photo list.

---

## F5: Photo Export

Export curated (kept) photos to a configurable per-project output directory.

### Configuration

Each project has an optional **output directory** (`outputDir`), configurable via:

- The **Create Project** dialog (optional field with folder picker)
- The **Export** button in the project header (prompts for directory if not yet set)
- `PATCH /api/projects/[projectId]` with `{ outputDir: string }`

The output directory is validated to exist on the filesystem when set.

### Export behavior

`POST /api/projects/[projectId]/export` copies all photos with `status: "keep"` and `fileExists: true` to the project's output directory.

- **Idempotent**: files already present in the output directory (matched by filename) are skipped
- Uses `fs.copyFile` for local disk-to-disk copies
- Returns `{ exported, skipped, failed, total }` counts

### Export UI

An **Export** button appears in the project header alongside the Sync button:

- If `outputDir` is set: triggers export immediately, shows result summary
- If `outputDir` is not set: opens a folder picker to set it first, then exports
- Result messages: "X exported, Y skipped" or "No photos to export"

---

## Future Considerations

- Google Photos API integration for direct upload
- Apple Photos integration for direct import
- Batch operations (keep all / discard all in a group)
- Tagging / labeling photos
- EXIF-based grouping (by date, location)
