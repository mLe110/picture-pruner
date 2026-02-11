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

## Session and import endpoints (Slice 2)

Create a session:

```bash
curl -X POST http://localhost:3001/api/sessions \
  -H "content-type: application/json" \
  -d '{"importRoot":"/absolute/path/to/photo-folder"}'
```

Import photos for an existing session:

```bash
curl -X POST http://localhost:3001/api/sessions/<session-id>/import
```

Run exact duplicate analysis:

```bash
curl -X POST http://localhost:3001/api/sessions/<session-id>/analysis/exact-duplicates
```

List exact duplicate groups:

```bash
curl http://localhost:3001/api/sessions/<session-id>/analysis/exact-duplicates
```

Run similar-candidate analysis (heuristic):

```bash
curl -X POST http://localhost:3001/api/sessions/<session-id>/analysis/similar-candidates
```

List similar-candidate groups:

```bash
curl http://localhost:3001/api/sessions/<session-id>/analysis/similar-candidates
```

Set a review decision for one photo:

```bash
curl -X PUT http://localhost:3001/api/sessions/<session-id>/decisions/<photo-id> \
  -H "content-type: application/json" \
  -d '{"decision":"keep","reason":"best composition"}'
```

Get all decisions for a session:

```bash
curl http://localhost:3001/api/sessions/<session-id>/decisions
```

Get curation progress summary:

```bash
curl http://localhost:3001/api/sessions/<session-id>/progress
```
