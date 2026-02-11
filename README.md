# picture-pruner

Local-first photo curation app to prune vacation photos before exporting the final selection.

## Monorepo layout

- `apps/api`: Fastify + Drizzle + SQLite backend
- `apps/web`: React + Vite frontend
- `packages/shared`: shared TypeScript contracts and domain types

## Getting started

1. Install dependencies:

```bash
pnpm install
```

2. Run the initial database migration:

```bash
pnpm db:migrate
```

The migration command creates the SQLite parent directory automatically (`apps/api/data`) if it does not exist.

3. Start web and API in parallel:

```bash
pnpm dev
```

Web runs on `http://localhost:5173`, API on `http://localhost:3001`.

## API quick check

```bash
curl http://localhost:3001/api/health
```
