#!/bin/bash

# SessionStart sanity check — warns about environment issues via stderr.
# Always exits 0 (non-blocking).

WARNINGS=()
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# 1. Node.js installed & v18+
if ! command -v node &>/dev/null; then
  WARNINGS+=("Node.js not found")
else
  NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -lt 18 ] 2>/dev/null; then
    WARNINGS+=("Node.js v${NODE_MAJOR} found, expected v18+")
  fi
fi

# 2. pnpm installed
if ! command -v pnpm &>/dev/null; then
  WARNINGS+=("pnpm is not installed")
fi

# 3. .env file exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
  WARNINGS+=(".env file is missing — copy from .env.example")
fi

# 4. Git repository
if ! git -C "$PROJECT_DIR" rev-parse --is-inside-work-tree &>/dev/null; then
  WARNINGS+=("Not inside a git repository")
fi

# 5. Dirty working tree
if [ -n "$(git -C "$PROJECT_DIR" status --porcelain 2>/dev/null)" ]; then
  WARNINGS+=("Git working tree has uncommitted changes")
fi

# 6. Dependencies installed
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
  WARNINGS+=("node_modules missing — run pnpm install")
fi

# 7. PostgreSQL reachable
if [ -n "$DB_URL" ]; then
  # Extract host and port from DATABASE_URL
  DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:/]+).*|\1|')
  DB_PORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  DB_PORT=${DB_PORT:-5432}

  if command -v pg_isready &>/dev/null; then
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -t 3 &>/dev/null; then
      WARNINGS+=("PostgreSQL is not reachable at ${DB_HOST}:${DB_PORT}")
    fi
  fi
fi

# Print warnings
if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo "=== Session Environment Checks ===" >&2
  for w in "${WARNINGS[@]}"; do
    echo "  ⚠ $w" >&2
  done
  echo "===================================" >&2
fi

exit 0
