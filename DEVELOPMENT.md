# Development Guide

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Git](https://git-scm.com/)
- A [GitHub OAuth App](https://github.com/settings/developers) (see below)

## Initial Setup

### 1. Clone the repository

```bash
git clone https://github.com/Imprint-Development/imprint.git
cd imprint
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the values:

| Variable             | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`       | Postgres connection string. Default works with the Docker Compose setup. |
| `AUTH_SECRET`        | Random secret for signing sessions. Generate one with `npx auth secret`. |
| `AUTH_GITHUB_ID`     | GitHub OAuth App client ID (see below).                                  |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App client secret (see below).                              |
| `REDIS_URL`          | Redis connection string. Default works with the Docker Compose setup.    |

### 4. Create a GitHub OAuth App (optional for local dev)

If you want to test GitHub OAuth locally, create an OAuth App. Otherwise you can skip this and use the local admin login (see below).

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** Imprint (dev)
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
4. Copy the **Client ID** and **Client Secret** into your `.env` file

### 5. Start infrastructure

```bash
docker compose up -d
```

This starts:

- **PostgreSQL 16** on port 5432 (user: `postgres`, password: `postgres`, database: `imprint`)
- **Redis 7** on port 6379

### 6. Run database migrations

```bash
npx drizzle-kit generate   # generate migration files from the schema
npx drizzle-kit migrate    # apply migrations to the database
```

### 7. Start the dev server

```bash
npm run dev
```

The app is now running at [http://localhost:3000](http://localhost:3000).

## Local Admin Login

In development mode, the login page shows an additional **"Sign in as Local Admin"** form below the GitHub button. Use these credentials:

- **Username:** `admin`
- **Password:** `admin`

This creates (or reuses) a local user with email `admin@localhost` and role `admin`. No GitHub OAuth App is needed for this to work — just the database.

This login method is only available when `NODE_ENV=development` and is not compiled into production builds.

## Common Commands

| Command                    | Description                             |
| -------------------------- | --------------------------------------- |
| `npm run dev`              | Start the development server            |
| `npm run build`            | Production build                        |
| `npm run start`            | Start the production server             |
| `npm run lint`             | Run ESLint                              |
| `npx drizzle-kit generate` | Generate migrations from schema changes |
| `npx drizzle-kit migrate`  | Apply pending migrations                |
| `npx drizzle-kit studio`   | Open Drizzle Studio (database browser)  |
| `docker compose up -d`     | Start Postgres and Redis                |
| `docker compose down`      | Stop Postgres and Redis                 |
| `docker compose down -v`   | Stop and delete all data                |

## Project Structure

```
src/
├── app/
│   ├── (auth)/                 # Login page (unauthenticated)
│   ├── (dashboard)/            # All authenticated pages
│   │   ├── courses/            # Course CRUD, groups, checkpoints
│   │   ├── dashboard/          # Home page
│   │   └── grading/            # Grading tables and CSV export
│   └── api/                    # API routes (auth, grading export)
├── lib/
│   ├── actions/                # Server actions (courses, groups, checkpoints, grading)
│   ├── analysis/               # Git analysis engine
│   ├── auth/                   # Auth.js configuration
│   └── db/                     # Drizzle schema and client
└── middleware.ts               # Route protection
```

## Database Schema Changes

1. Edit `src/lib/db/schema.ts`
2. Run `npx drizzle-kit generate` to create a migration
3. Run `npx drizzle-kit migrate` to apply it
4. Restart the dev server if needed

## Resetting the Database

```bash
docker compose down -v          # removes the Postgres volume
docker compose up -d            # fresh database
npx drizzle-kit migrate         # re-apply all migrations
```
