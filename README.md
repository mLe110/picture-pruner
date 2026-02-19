# Picture Pruner

Local web app for managing large shared photo collections. Identifies exact duplicates, finds visually similar photos, and lets you manually curate before exporting approved selections. Photos are read from and exported to local directories.

## Prerequisites

- [Bun](https://bun.sh/) (runtime)
- [pnpm](https://pnpm.io/) (package manager)
- [PostgreSQL](https://www.postgresql.org/) with [pgvector](https://github.com/pgvector/pgvector) extension

## Setup

```bash
pnpm install
cp .env.example .env  # then edit .env
```

## Commands

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `pnpm dev`         | Start all packages in dev/watch mode |
| `pnpm build`       | Build all packages                   |
| `pnpm test`        | Run all tests via Vitest             |
| `pnpm db:generate` | Generate Drizzle migrations          |
| `pnpm db:migrate`  | Run database migrations              |
| `pnpm lint`        | Check for lint errors                |
| `pnpm lint:fix`    | Fix lint errors                      |
| `pnpm format`      | Check formatting                     |
| `pnpm format:fix`  | Fix formatting                       |

## Usage

1. Place photos in `data/input/`
2. Run `pnpm dev` and open the frontend
3. Import, review duplicates/similar groups, and curate
4. Export approved photos — they appear in `data/output/`
