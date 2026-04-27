#!/bin/sh
set -e

echo "Running database migrations..."
if ! node /app/scripts/migrate.mjs; then
  echo "ERROR: Database migrations failed. Aborting startup." >&2
  exit 1
fi

exec "$@"
