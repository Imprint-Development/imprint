# Imprint

Imprint analyzes student contributions in Software Engineering courses by examining the full spectrum of project work — not just code, but the complete development process.

## What it measures

- **Code & Testing** — volume, quality, and patterns of code and test contributions
- **Code Review** — frequency, depth, and quality of peer reviews
- **Process Work** — backlog grooming, sprint board management, and planning activities

## Why

In team-based Software Engineering courses, individual contributions are hard to assess. Imprint makes each student's impact visible across all dimensions of the development process, giving instructors a fair and comprehensive view of participation.

## Container image

Container images are published to the GitHub Container Registry on every push to `main` and on every `v*` tag:

```
ghcr.io/imprint-development/imprint:main        # latest main build
ghcr.io/imprint-development/imprint:1.2.3       # specific release
ghcr.io/imprint-development/imprint:1.2         # minor-version alias
ghcr.io/imprint-development/imprint:sha-<sha>   # exact commit
```

## Self-hosting with Docker Compose

1. Copy the environment file and fill in the required values:

   ```bash
   cp .env.example .env
   ```

   | Variable             | Description                                            |
   | -------------------- | ------------------------------------------------------ |
   | `AUTH_SECRET`        | Random secret for signing sessions (`npx auth secret`) |
   | `AUTH_GITHUB_ID`     | GitHub OAuth App client ID                             |
   | `AUTH_GITHUB_SECRET` | GitHub OAuth App client secret                         |

2. Start the full stack (app + PostgreSQL + Redis):

   ```bash
   docker compose --profile app up -d
   ```

The app is now available at [http://localhost:3000](http://localhost:3000). Database migrations are applied automatically on every container start.

> **Note:** `DATABASE_URL` and `REDIS_URL` are pre-configured in `docker-compose.yml` to point at the bundled postgres and redis services. Only the three variables in the table above need to be set in your `.env` file.

For local development see [DEVELOPMENT.md](DEVELOPMENT.md).
