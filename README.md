# Picture Pruner

A local-first web app for managing large shared photo collections. Point it at any directory on your machine, and Picture Pruner will scan for exact duplicates, find visually similar photos, and give you a fast keyboard-driven review UI to curate what to keep. Any changes in the UI are persisted automatically, so you can pick up where you left off. When you're done, export your approved selections to an output directory.

Photos never leave your machine — the app reads from and writes to local directories.

For a detailed breakdown of all features, see [`docs/FEATURES.md`](docs/FEATURES.md).

## What It Does

- **Import** photos from any local directory (JPEG, PNG, HEIC) — files stay in place, only metadata is stored
- **Detect exact duplicates** via SHA-256 content hashing
- **Find visually similar photos** (burst shots, reframes, compression variants) using dHash perceptual hashing with Hamming distance grouping
- **Review & curate** in a web UI with photo grid, lightbox, and keyboard shortcuts (`K` keep / `M` maybe / `D` discard)
- **Export** approved photos to a configurable output directory

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) (package manager)
- [Docker](https://www.docker.com/) (for PostgreSQL via the included `dev/docker-compose.yml`)

### Setup

```bash
# Clone the repository
git clone https://github.com/mLe110/picture-pruner.git
cd picture-pruner

# Install dependencies
pnpm install

# Start PostgreSQL (requires Docker)
docker compose -f dev/docker-compose.yml up -d

# Configure environment
cp .env.example .env
# Edit .env if needed (default matches the Docker Compose setup)

# Run database migrations
pnpm db:migrate

# Start the dev server
pnpm dev
```

The app will be available at `http://localhost:3000`.

## Usage

1. **Create a project** — give it a name and point it at a directory containing your photos
2. **Auto-sync** — the app scans the directory on each page load, picking up new, removed, and restored files
3. **Review duplicates & similar groups** — switch between Browse / Duplicates / Similar tabs to see grouped photos side-by-side
4. **Curate** — mark photos as keep, maybe, or discard (use the lightbox + keyboard shortcuts for speed)
5. **Export** — copy all "keep" photos to an output directory of your choice

## Commands

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `pnpm dev`         | Start Next.js dev server       |
| `pnpm build`       | Production build               |
| `pnpm test`        | Run all tests via Vitest       |
| `pnpm db:generate` | Generate Drizzle migrations    |
| `pnpm db:migrate`  | Run database migrations        |
| `pnpm lint`        | Check for lint errors          |
| `pnpm lint:fix`    | Fix lint errors                |
| `pnpm format`      | Check formatting with Prettier |
| `pnpm format:fix`  | Fix formatting with Prettier   |

## Tech Stack & Key Decisions

| Area             | Choice                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Framework        | [Next.js](https://nextjs.org/) 15 (React 19)                                                        |
| Language         | TypeScript (strict mode)                                                                            |
| Database         | PostgreSQL + [pgvector](https://github.com/pgvector/pgvector)                                       |
| ORM & Migrations | [Drizzle ORM](https://orm.drizzle.team/) — schema in `src/db/schema/`, migrations via `drizzle-kit` |
| Validation       | [Zod](https://zod.dev/) — all types derived from Zod schemas, never standalone interfaces           |
| Image Processing | [sharp](https://sharp.pixelplumbing.com/) for perceptual hash computation                           |
| UI Components    | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) + Tailwind CSS          |
| Testing          | [Vitest](https://vitest.dev/)                                                                       |
