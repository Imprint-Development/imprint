import { Octokit } from "@octokit/rest";
import { db } from "@/lib/db";
import { checkpointAnalyses, students, repositories } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { PipelineContext } from "./types";

export interface ReviewMetrics {
  prsReviewed: number;
  approvals: number;
  changesRequested: number;
  reviewComments: number;
  issueComments: number;
}

export interface ReviewWarnings {
  /** Students who were never matched from any GitHub login */
  unmatchedStudents: string[];
}

function emptyReviewMetrics(): ReviewMetrics {
  return {
    prsReviewed: 0,
    approvals: 0,
    changesRequested: 0,
    reviewComments: 0,
    issueComments: 0,
  };
}

/**
 * Parse a GitHub repo URL (HTTPS or SSH) and return { owner, repo }.
 * Returns null if the URL is not a recognisable GitHub URL.
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // SSH: git@github.com:owner/repo.git
  const sshMatch = url.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

  // HTTPS: https://github.com/owner/repo[.git]
  const httpsMatch = url.match(
    /https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?(?:\/.*)?$/
  );
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };

  return null;
}

/**
 * Fetch the public email for a GitHub user login. Returns null when the
 * profile has no public email (very common).
 */
async function getGitHubEmail(
  octokit: Octokit,
  login: string
): Promise<string | null> {
  try {
    const { data } = await octokit.users.getByUsername({ username: login });
    return data.email ?? null;
  } catch {
    return null;
  }
}

export async function runReviewPipeline(
  ctx: PipelineContext
): Promise<ReviewWarnings> {
  const { checkpoint, group, ignoredEmails, ignoredGithubUsernames, log } = ctx;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    await log("warn", "GITHUB_TOKEN is not set — review pipeline skipped");
    return { unmatchedStudents: [] };
  }

  const octokit = new Octokit({ auth: token });

  const groupStudents = await db
    .select()
    .from(students)
    .where(eq(students.groupId, group.id));

  const groupRepos = await db
    .select()
    .from(repositories)
    .where(eq(repositories.groupId, group.id));

  if (groupRepos.length === 0) {
    await log("warn", "No repositories found for this group");
    return { unmatchedStudents: [] };
  }

  // Build a map of known student emails → studentId for matching
  const emailToStudentId = new Map<string, string>();
  // Build a map of known github usernames → studentId for direct login matching
  const githubUsernameToStudentId = new Map<string, string>();
  for (const student of groupStudents) {
    emailToStudentId.set(student.email.toLowerCase(), student.id);
    for (const e of student.gitEmails) {
      emailToStudentId.set(e.toLowerCase(), student.id);
    }
    if (student.githubUsername) {
      githubUsernameToStudentId.set(
        student.githubUsername.toLowerCase(),
        student.id
      );
    }
  }

  // Accumulate review metrics per studentId
  const metricsMap = new Map<string, ReviewMetrics>();
  for (const student of groupStudents) {
    metricsMap.set(student.id, emptyReviewMetrics());
  }

  // Cache GitHub login → resolved studentId to avoid redundant API calls
  const loginToStudentId = new Map<string, string | null>();

  // Track which students were matched from at least one GitHub login (across all repos)
  const resolvedStudentIds = new Set<string>();

  async function resolveLogin(login: string): Promise<string | null> {
    if (loginToStudentId.has(login)) return loginToStudentId.get(login)!;

    // Skip logins that are globally ignored for this course
    if (ignoredGithubUsernames.has(login.toLowerCase())) {
      loginToStudentId.set(login, null);
      return null;
    }

    // Try direct GitHub username match first (no API call needed)
    const byUsername = githubUsernameToStudentId.get(login.toLowerCase());
    if (byUsername) {
      loginToStudentId.set(login, byUsername);
      resolvedStudentIds.add(byUsername);
      return byUsername;
    }

    // Fall back to matching by public profile email
    const email = await getGitHubEmail(octokit, login);
    if (email) {
      const normalised = email.toLowerCase();
      if (!ignoredEmails.has(normalised) && emailToStudentId.has(normalised)) {
        const id = emailToStudentId.get(normalised)!;
        loginToStudentId.set(login, id);
        resolvedStudentIds.add(id);
        return id;
      }
    }

    loginToStudentId.set(login, null);
    return null;
  }

  for (const repo of groupRepos) {
    const parsed = parseGitHubUrl(repo.url);
    if (!parsed) {
      await log(
        "warn",
        `Cannot parse GitHub URL: ${repo.url} — skipping`,
        repo.id
      );
      continue;
    }

    const { owner, repo: repoName } = parsed;
    await log("info", `Fetching PRs for ${owner}/${repoName}`, repo.id);

    // Track unmapped logins per repo
    const repoUnmappedLogins = new Set<string>();

    // Fetch all closed/merged PRs (GitHub only returns merged PRs as closed)
    let page = 1;
    const since = checkpoint.startDate ?? undefined;
    const until = checkpoint.endDate ?? undefined;

    while (true) {
      const { data: prs } = await octokit.pulls.list({
        owner,
        repo: repoName,
        state: "closed",
        per_page: 100,
        page,
        sort: "updated",
        direction: "desc",
      });

      if (prs.length === 0) break;

      // Stop paginating once PRs are older than the start date
      const oldestUpdated = new Date(prs[prs.length - 1].updated_at);
      if (since && oldestUpdated < since) {
        const inRange = prs.filter((pr) => {
          const updated = new Date(pr.updated_at);
          return (!since || updated >= since) && (!until || updated <= until);
        });
        await processPrs(inRange);
        break;
      }

      const inRange = prs.filter((pr) => {
        const updated = new Date(pr.updated_at);
        return (!since || updated >= since) && (!until || updated <= until);
      });
      await processPrs(inRange);
      page++;
    }

    // Emit per-repo warnings for unmapped logins
    if (repoUnmappedLogins.size > 0) {
      await log(
        "warn",
        `The following GitHub users interacted on PRs but could not be matched to any student in this group: ${[...repoUnmappedLogins].join(", ")}.`,
        repo.id
      );
    }

    async function processPrs(
      prs: Awaited<ReturnType<typeof octokit.pulls.list>>["data"]
    ) {
      for (const pr of prs) {
        await log("info", `Processing PR #${pr.number}: ${pr.title}`, repo.id);

        // Fetch formal reviews (approvals / change requests)
        const { data: reviews } = await octokit.pulls.listReviews({
          owner,
          repo: repoName,
          pull_number: pr.number,
          per_page: 100,
        });

        const reviewedBy = new Set<string>();

        for (const review of reviews) {
          const login = review.user?.login;
          if (!login) continue;

          const submittedAt = review.submitted_at
            ? new Date(review.submitted_at)
            : null;
          if (since && submittedAt && submittedAt < since) continue;
          if (until && submittedAt && submittedAt > until) continue;

          const studentId = await resolveLogin(login);
          if (!studentId) {
            if (
              loginToStudentId.get(login) === null &&
              !ignoredGithubUsernames.has(login.toLowerCase())
            )
              repoUnmappedLogins.add(login);
            continue;
          }

          const m = metricsMap.get(studentId)!;
          reviewedBy.add(studentId);

          if (review.state === "APPROVED") m.approvals++;
          else if (review.state === "CHANGES_REQUESTED") m.changesRequested++;

          // Count inline review comments from this review
          m.reviewComments += review.body ? 1 : 0;
        }

        // Count each student once per PR reviewed
        for (const studentId of reviewedBy) {
          metricsMap.get(studentId)!.prsReviewed++;
        }

        // Fetch inline review comments (line-level code comments)
        const { data: reviewComments } = await octokit.pulls.listReviewComments(
          {
            owner,
            repo: repoName,
            pull_number: pr.number,
            per_page: 100,
          }
        );

        for (const comment of reviewComments) {
          const login = comment.user?.login;
          if (!login) continue;

          const createdAt = new Date(comment.created_at);
          if (since && createdAt < since) continue;
          if (until && createdAt > until) continue;

          const studentId = await resolveLogin(login);
          if (!studentId) {
            if (
              loginToStudentId.get(login) === null &&
              !ignoredGithubUsernames.has(login.toLowerCase())
            )
              repoUnmappedLogins.add(login);
            continue;
          }

          metricsMap.get(studentId)!.reviewComments++;
        }

        // Fetch general issue comments on the PR
        const { data: issueComments } = await octokit.issues.listComments({
          owner,
          repo: repoName,
          issue_number: pr.number,
          per_page: 100,
        });

        for (const comment of issueComments) {
          const login = comment.user?.login;
          if (!login) continue;

          const createdAt = new Date(comment.created_at);
          if (since && createdAt < since) continue;
          if (until && createdAt > until) continue;

          const studentId = await resolveLogin(login);
          if (!studentId) {
            if (
              loginToStudentId.get(login) === null &&
              !ignoredGithubUsernames.has(login.toLowerCase())
            )
              repoUnmappedLogins.add(login);
            continue;
          }

          metricsMap.get(studentId)!.issueComments++;
        }
      }
    }
  }

  // Warn about students who were never matched from any GitHub login —
  // their review activity will be missing or incomplete.
  const unmatchedStudents = groupStudents.filter(
    (s) => !resolvedStudentIds.has(s.id)
  );
  if (unmatchedStudents.length > 0) {
    await log(
      "warn",
      `The following students could not be matched to a GitHub account and their review activity may be missing: ${unmatchedStudents.map((s) => s.displayName).join(", ")}. ` +
        `Ensure each student has a GitHub username set, a public GitHub email that matches their registered email, or add git email aliases.`
    );
  }

  // Persist metrics — upsert into existing checkpointAnalyses rows
  const repoIds = groupRepos.map((r) => r.id);

  for (const student of groupStudents) {
    const metrics = metricsMap.get(student.id) ?? emptyReviewMetrics();

    // Find the existing analysis row(s) for this student/checkpoint and update
    const existingRows = await db
      .select({ id: checkpointAnalyses.id })
      .from(checkpointAnalyses)
      .where(
        and(
          eq(checkpointAnalyses.checkpointId, checkpoint.id),
          eq(checkpointAnalyses.studentId, student.id),
          inArray(checkpointAnalyses.repositoryId, repoIds)
        )
      );

    if (existingRows.length > 0) {
      await db
        .update(checkpointAnalyses)
        .set({ reviewMetrics: metrics })
        .where(
          and(
            eq(checkpointAnalyses.checkpointId, checkpoint.id),
            eq(checkpointAnalyses.studentId, student.id),
            inArray(checkpointAnalyses.repositoryId, repoIds)
          )
        );
    } else {
      // No contributions row yet — insert a minimal row so the data isn't lost
      for (const repo of groupRepos) {
        await db.insert(checkpointAnalyses).values({
          checkpointId: checkpoint.id,
          studentId: student.id,
          repositoryId: repo.id,
          codeMetrics: null,
          testMetrics: null,
          docMetrics: null,
          cicdMetrics: null,
          reviewMetrics: metrics,
          boardMetrics: null,
        });
      }
    }
  }

  await log("info", "Review pipeline complete");

  return {
    unmatchedStudents: unmatchedStudents.map((s) => s.displayName),
  };
}
