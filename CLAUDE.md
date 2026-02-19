# CLAUDE.md — Picture Pruner

## Project Overview

Local web app for managing large shared photo collections. Identifies exact duplicates, visually similar photos, and enables manual curation before exporting approved selections. Built as a local-first tool — photos are read from and exported to local directories within the repository.

## Tech Stack

- **Package Manager**: pnpm
- **Language**: TypeScript (strict mode)
- **Framework**: Next.js (React)
- **Testing**: Vitest
- **Validation/Schemas**: Zod — all types MUST be derived from Zod schemas (`z.infer<typeof Schema>`)
- **Database**: PostgreSQL with pgvector extension
- **ORM**: Drizzle ORM
- **Image Similarity**: Hybrid approach — exact hashing + perceptual hashing + vector embeddings (details TBD before implementation)

## Behavioral Rules

MOST IMPORTANT RULE: Always close the loop. Everytime you implement anything, ensure to test it afterwards before telling me it is finished. Implemented a new feature - run the tests, updated package.json - run pnpm install, any script you added, run tests, etc. Do not tell me something is done if you have not verified it yourself.

- Before ANY code change, run `pnpm test`. After ANY code change, run `pnpm test`. Do not commit if tests fail.
- Before changing any function signature or interface, grep for all usages and update every caller.
- Never modify `src/schemas/` without checking which files import the affected schemas.
- When adding a new API route, always add a corresponding test file.
- When unsure about a design decision, STOP and ask — do not guess.
- Keep commits small and focused — one logical change per commit, conventional commit format.
- ONLY commit when tests are passing and the code is in a clean, reviewable state. Do not commit "WIP" or broken code.
- After ANY implementation change, verify the application actually starts (`pnpm dev` must launch without errors). Never consider work complete until startup is confirmed.
- When requiring up-to-date documentation for any tool, framework, etc., use the context7 MCP.

## Repository Structure

```
picture-pruner/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── vitest.config.ts
├── components.json
├── drizzle.config.ts
├── eslint.config.js
├── .env / .env.example
├── docs/
│   └── FEATURES.md             # Feature documentation (source of truth for product scope)
├── data/
│   ├── input/                  # Drop exported photos here for import
│   └── output/                 # Approved/curated photos are exported here
├── src/
│   ├── app/                    # Next.js pages
│   ├── components/             # React components
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── utils.ts            # cn() utility
│   │   ├── photo-scanner.ts    # Filesystem photo scanning
│   │   ├── photo-utils.ts      # Photo URL and formatting helpers
│   │   └── config.ts           # Zod-validated config from env vars
│   ├── db/
│   │   ├── index.ts            # Drizzle client
│   │   ├── schema/             # Drizzle schema definitions
│   │   └── migrations/         # Generated migrations
│   └── schemas/
│       ├── photo.ts            # Zod schemas (Photo, PhotoStatus, PhotoFilter)
│       └── index.ts            # Barrel export
└── test/                       # All tests (mirrors src/ structure)
```

## Architectural Decisions

### Schema-First Types (Zod)

Every data structure MUST be defined as a Zod schema first. TypeScript types are always derived:

```typescript
// CORRECT
const PhotoSchema = z.object({
  id: z.string().uuid(),
  filePath: z.string(),
  hash: z.string(),
});
type Photo = z.infer<typeof PhotoSchema>;

// WRONG — never define standalone interfaces/types for data structures
interface Photo {
  id: string;
  filePath: string;
  hash: string;
}
```

### Configuration

- Configuration type is defined in single config.ts file - as zod schema.
- Single source of truth for all configuration values. All code that needs config imports from this file.
- Configuration object is loaded from environment variables during startup AND validated.
- If schema validation fails, the application should fail to start with a clear error message indicating which config values are missing or invalid.
- For local development, use `.env` files. A `.env.example` will be maintained at the root.

### Database

- Drizzle as ORM
- Drizzle schemas live in `src/db/schema/`
- Migrations are generated via `drizzle-kit`
- pgvector columns are used for image embedding storage and similarity search

### Test Organization

- Test Isolation: When mocking components in tests, use vi.spyOn() with vi.restoreAllMocks() in afterEach hooks rather than global vi.mock() to prevent memory leaks and test pollution
- Memory Management: Avoid global mocks that can leak between tests and accumulate memory usage over time
- Test philosophy
  - Mock as little as possible: Try and rephrase code not to require it.
  - Try not to rely on internal state: don't manipulate objects' inner state in tests
  - Use idiomatic vitest assertions (expect/toBe/toEqual) instead of node assert
- File names mirror source files, but in a parallel test/ directory (e.g., `src/lib/photo-utils.ts` → `test/lib/photo-utils.test.ts`)

## Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start Next.js dev server
pnpm test                 # Run all tests via vitest
pnpm build                # Production build
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Run migrations
```

## Coding Conventions

- Naming: camelCase for variables and functions, PascalCase for classes and types, UPPER_SNAKE_CASE for constants
- Zod schemas go in `src/schemas/`
- Prefer `const` assertions and literal types where applicable
- Use barrel exports (`index.ts`) sparingly — only at package boundaries
- Test files live in a `test/` directory mirroring the `src/` structure
- Import path alias: `@/` maps to `./src/`

## Common Mistakes to Avoid

- Do NOT use raw SQL for queries — use Drizzle query builder
- Do NOT store photo blobs in the database — store file paths/references only

## Documentation

**Any notable feature addition, update, or removal MUST be reflected in the `docs/` directory.**

- `docs/FEATURES.md` — Canonical feature documentation describing product scope and capabilities
- Keep docs concise and up-to-date; they serve as context for new sessions
