<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Commit conventions

All commits **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This is enforced by commitlint on every PR.

Format: `<type>(<optional scope>): <description>`

Allowed types:

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `ci`       | CI/CD pipeline changes                                  |
| `chore`    | Maintenance, dependency updates, tooling                |
| `docs`     | Documentation only changes                              |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or updating tests                                |
| `style`    | Formatting changes (no logic change)                    |
| `perf`     | Performance improvements                                |
| `revert`   | Reverts a previous commit                               |

Examples:

```
feat(groups): add rename group action and UI
fix(auth): resolve hydration mismatch in LoginClient
ci: add commitlint enforcement to PR checks
chore: upgrade MUI Joy to v5.1.0
```

Breaking changes must include `BREAKING CHANGE:` in the commit body or a `!` after the type, e.g. `feat!: redesign grading API`.

## CI pipeline

The pipeline is defined in `.github/workflows/ci.yml` and runs on every push to `main`, every `v*` tag, and every pull request.

| Job                     | Trigger                         | What it does                                                        |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------- |
| `commitlint`            | PRs only                        | Checks every commit in the PR against the conventional commits spec |
| `lint-typecheck-format` | push + PR                       | `eslint`, `tsc --noEmit`, `prettier --check`                        |
| `test`                  | push + PR                       | `vitest run`                                                        |
| `build`                 | push + PR                       | `next build` (DATABASE_URL stubbed — no real DB needed)             |
| `publish`               | push to `main` or `v*` tag only | Builds and pushes a container image to `ghcr.io`                    |

The `publish` job only runs after `lint-typecheck-format`, `test`, and `build` all pass.

### Container image tags

Images are published to `ghcr.io/<org>/imprint` with the following tags:

- `main` — latest build from the main branch
- `1.2.3` / `1.2` — semver tags derived from `v*` git tags
- `sha-<sha>` — always present for traceability

### Local checks

Run these before pushing to avoid CI failures:

```sh
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run format:check  # Prettier (use `npm run format` to auto-fix)
npm test              # Vitest
```
