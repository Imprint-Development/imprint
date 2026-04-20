# Imprint — Architecture

Imprint is a SaaS platform that analyzes student contributions in Software Engineering courses. It examines the full spectrum of project work — code, tests, documentation, CI/CD, code reviews, and project board activity — to give lecturers a fair and comprehensive view of individual participation.

---

## 1. High-Level Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend    │────▶│  Database    │     │  Workers    │
│   Next.js    │◀────│   Next.js    │◀────│  PostgreSQL  │     │  BullMQ     │
│   (React)    │     │   API Routes │     │  + Drizzle   │     │  (Analysis) │
└─────────────┘     └──────┬───────┘     └──────────────┘     └──────┬──────┘
                           │                                         │
                           ├─────────────────────────────────────────┘
                           │
                    ┌──────▼───────┐     ┌──────────────┐
                    │  GitHub API  │     │  Redis       │
                    │  (Octokit)   │     │  (Queue/Cache)│
                    └──────────────┘     └──────────────┘
```

---

## 2. Technology Choices

### Frontend + Backend: Next.js 15 (App Router)

**Why:**
- Full-stack in one framework — API routes, SSR, and React UI in a single deployment. For a small team building a SaaS, this eliminates the overhead of managing separate frontend/backend repos and deployments.
- Server Components reduce client-side JS, improving load times for data-heavy dashboards.
- Built-in routing, middleware (for auth guards), and image optimization out of the box.
- Massive ecosystem and hiring pool. Well-documented.
- **Alternative considered:** Separate SPA (Vite + React) + standalone API (Fastify/Express). Rejected because it doubles deployment complexity with no clear benefit at this scale.

### UI Components: MUI Joy UI

**Why:**
- Joy UI is MUI's modern component library built for clean, minimal interfaces. It provides a comprehensive set of accessible components (Cards, Tables, Inputs, Sheets, Drawers) with a design language that suits data-heavy dashboards.
- Built-in CSS variables-based theming with dark mode support out of the box.
- Based on the Joy UI "Order Dashboard" and "Sign In Side" templates for a polished, professional look.
- Emotion-based styling (CSS-in-JS) with an `sx` prop for responsive, component-scoped styles.
- **Alternative considered:** shadcn/ui + Tailwind CSS. Viable, but Joy UI provides more out-of-the-box components (Drawer, Table, Breadcrumbs) with consistent design tokens, reducing custom CSS work.

### Charts/Visualization: Recharts

**Why:**
- React-native charting library, composes well with React components.
- Good support for bar charts, radar charts, and stacked area charts — all needed for contribution breakdowns.
- Lightweight compared to D3 (which is overkill for structured dashboards).
- **Alternative considered:** Chart.js (via react-chartjs-2). Viable, but Recharts has more idiomatic React integration.

### Database: PostgreSQL

**Why:**
- Relational data is the natural fit — courses have users, users have roles, courses have repos, repos have checkpoints, checkpoints have analysis results. These are all well-defined relationships.
- JSONB columns for flexible storage of raw GitHub API responses (board snapshots, PR metadata) without needing a separate document store.
- Mature, battle-tested, excellent tooling.
- **Alternative considered:** MongoDB. Rejected — the data model is inherently relational; document stores would lead to denormalization headaches for queries like "show me all contributions across all repos in a course."

### ORM: Drizzle ORM

**Why:**
- Type-safe SQL with zero runtime overhead — queries map 1:1 to SQL, no magic.
- Schema-as-code with excellent migration tooling (`drizzle-kit`).
- Much lighter than Prisma (no engine binary, no query engine process).
- **Alternative considered:** Prisma. Rejected — heavier runtime, slower cold starts, and the Prisma engine adds deployment complexity. Drizzle is closer to SQL, which is better for the complex analytical queries this project needs.

### Authentication: Auth.js (NextAuth) v5 with GitHub OAuth

**Why:**
- Native Next.js integration with App Router support.
- GitHub OAuth is the natural provider — lecturers likely already have GitHub accounts, and we need GitHub API access anyway for repo analysis.
- Supports adding more providers later (institutional SSO via SAML/OIDC).
- Built-in session management, CSRF protection, JWT/database sessions.
- **Alternative considered:** Clerk, Lucia. Clerk is paid and overkill; Lucia was deprecated. Auth.js is the established open-source solution.

### Background Jobs: BullMQ + Redis

**Why:**
- Repository analysis is expensive — cloning repos, running git log analysis, fetching GitHub API data. This must happen asynchronously.
- BullMQ provides reliable job queues with retries, rate limiting (critical for GitHub API limits), progress tracking, and scheduling.
- Redis doubles as a cache layer for GitHub API responses (which have rate limits).
- **Alternative considered:** Simple cron jobs or pg-boss (Postgres-based queues). Cron lacks reliability/retry logic; pg-boss adds load to the primary DB during heavy analysis runs.

### GitHub Integration: Octokit

**Why:**
- Official GitHub SDK for JavaScript/TypeScript. First-party support, always up to date with the API.
- Built-in pagination, rate limit handling, and auth.
- No real alternative worth considering.

### Git Analysis: simple-git

**Why:**
- Need to run `git log`, `git diff`, `git blame` etc. programmatically to attribute contributions.
- simple-git is a mature, well-maintained wrapper around the git CLI.
- For deeper analysis (lines changed per author, file-type breakdown), we parse git log output with custom logic.

### Deployment: Vercel + managed services (production), Docker Compose (local dev)

**Why:**
- **Production (Vercel):** Zero-config deployment for Next.js (built by the same team). Serverless functions for API routes, edge middleware for auth. Preview deployments per PR.
  - Database: **Neon** (serverless Postgres, free tier, branching for dev/preview).
  - Redis: **Upstash** (serverless Redis, pay-per-request, built-in BullMQ support).
- **Local development (Docker Compose):** Postgres + Redis + app in containers for easy contributor onboarding.
- **Alternative considered:** Self-hosted on a VPS (Hetzner/Railway). Viable long-term for cost, but Vercel removes all DevOps overhead for an early-stage project. Can migrate later.

### Future — AI Chatbot: Vercel AI SDK + OpenAI

**Why:**
- Vercel AI SDK provides streaming chat UI components and server-side LLM integration with minimal code.
- OpenAI for the model (or swap for any provider — the SDK is model-agnostic).
- RAG approach: embed analysis data into a vector store (pgvector extension in Postgres), retrieve relevant context per question.
- **Not built in phase 1** — but the architecture supports it. PostgreSQL + pgvector means no additional database needed when we add this.

---

## 3. Data Model

### Core Entities

```
User
├── id, email, name, role (admin | lecturer)
├── githubId, githubAccessToken

Course
├── id, name, semester, createdBy → User

CourseCollaborator (join table)
├── courseId → Course, userId → User, role (owner | collaborator)

StudentGroup
├── id, name, courseId → Course

Student
├── id, email, displayName, groupId → StudentGroup

Repository
├── id, url, groupId → StudentGroup
```

### Analysis Entities

```
Checkpoint
├── id, name, courseId → Course, timestamp, gitRef (hash/tag)
├── status (pending | analyzing | complete | failed)

CheckpointAnalysis (per student per repo per checkpoint)
├── id, checkpointId, studentId, repositoryId
├── codeMetrics: { commits, linesAdded, linesRemoved, filesChanged }
├── testMetrics: { testFilesChanged, testLinesAdded }
├── docMetrics: { docFilesChanged, docLinesAdded }
├── cicdMetrics: { workflowFilesChanged, pipelineConfigs }
├── reviewMetrics: { prsReviewed, commentsGiven, avgResponseTime }
├── boardMetrics: { issuesCreated, issuesClosed, issuesMoved }

BoardSnapshot (JSONB — raw GitHub project board state)
├── id, checkpointId, repositoryId, data (JSONB)

PullRequestSnapshot
├── id, checkpointId, repositoryId, prNumber, data (JSONB)
```

### Grading

```
Grade
├── id, checkpointId, groupId → StudentGroup
├── points, maxPoints, notes, gradedBy → User
```

### Design Decisions

**Student identity:** Students do not log in. Lecturers enter student email addresses, and we match them to git commits via the commit author email (`git log --format='%ae'`). Unmatched commits are flagged in the UI for manual resolution.

**Repository model:** Repositories are added individually by URL. A course can reference repos from any GitHub organization or personal account — there is no coupling between courses and GitHub orgs. This supports courses where students fork from a template or use personal repos.

---

## 4. Feature Phases

### Phase 1 — Foundation (MVP)

| Feature | Details |
|---|---|
| **Auth** | GitHub OAuth login, session management, lecturer role |
| **Course CRUD** | Create/edit/delete courses, invite collaborators |
| **Student Groups** | Add groups with students (by email), assign repos |
| **Checkpoint Creation** | Define checkpoints with name + git ref or timestamp |
| **Basic Analysis** | On checkpoint trigger: clone repos, run git log analysis, compute per-student code/test/doc metrics |
| **Dashboard** | Per-checkpoint view showing contribution breakdown per student (bar/radar charts) |
| **Grading** | Points input per checkpoint per group, exportable as CSV |

### Phase 2 — GitHub Integration Deep Dive

| Feature | Details |
|---|---|
| **PR Analysis** | Import PRs up to checkpoint, analyze review activity per student |
| **Board Import** | Snapshot GitHub Projects board state at checkpoint, analyze issue activity |
| **CI/CD Attribution** | Detect workflow file changes, attribute CI/CD contributions |
| **Comparison View** | Compare student contributions across checkpoints (timeline) |
| **Notifications** | Email/webhook when analysis completes |

### Phase 3 — Intelligence

| Feature | Details |
|---|---|
| **AI Chatbot** | "How did student X contribute in checkpoint 2?" — RAG over analysis data |
| **Anomaly Detection** | Flag unusual patterns (sudden spike in commits before deadline, empty commits, etc.) |
| **Report Generation** | PDF export of per-group or per-student analysis |
| **Institutional SSO** | SAML/OIDC for university login systems |

---

## 5. Project Structure

```
imprint/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login pages
│   │   ├── (dashboard)/        # Authenticated pages
│   │   │   ├── courses/
│   │   │   ├── checkpoints/
│   │   │   └── grading/
│   │   └── api/                # API routes
│   │       ├── courses/
│   │       ├── checkpoints/
│   │       ├── analysis/
│   │       └── webhooks/
│   ├── components/             # UI components (shadcn/ui)
│   ├── lib/
│   │   ├── db/                 # Drizzle schema + queries
│   │   ├── auth/               # Auth.js config
│   │   ├── github/             # Octokit wrappers
│   │   ├── analysis/           # Git analysis logic
│   │   └── queue/              # BullMQ job definitions
│   └── workers/                # Background job processors
├── drizzle/                    # Migrations
├── public/
├── docker-compose.yml          # Local dev: Postgres + Redis
├── Dockerfile
├── next.config.ts
├── drizzle.config.ts
├── tailwind.config.ts
└── package.json
```
