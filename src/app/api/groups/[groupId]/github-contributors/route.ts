import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  studentGroups,
  students,
  repositories,
  courseCollaborators,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { Octokit } from "@octokit/rest";

export interface GitHubContributor {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  /** Public profile email — null when not set or not fetchable */
  email: string | null;
}

export interface GitHubContributorsResponse {
  contributors: GitHubContributor[];
  students: {
    id: string;
    displayName: string;
    githubUsername: string | null;
    email: string;
    gitEmails: string[];
  }[];
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const sshMatch = url.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };
  const httpsMatch = url.match(
    /https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?(?:\/.*)?$/
  );
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await params;

  // Fetch the group to get the courseId for authorization
  const [group] = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.id, groupId))
    .limit(1);

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Verify the user is a collaborator on this course
  const [membership] = await db
    .select()
    .from(courseCollaborators)
    .where(
      and(
        eq(courseCollaborators.courseId, group.courseId),
        eq(courseCollaborators.userId, session.user.id)
      )
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN is not configured on the server" },
      { status: 503 }
    );
  }

  const octokit = new Octokit({ auth: token });

  const groupRepos = await db
    .select()
    .from(repositories)
    .where(eq(repositories.groupId, groupId));

  const groupStudents = await db
    .select({
      id: students.id,
      displayName: students.displayName,
      githubUsername: students.githubUsername,
      email: students.email,
      gitEmails: students.gitEmails,
    })
    .from(students)
    .where(eq(students.groupId, groupId));

  // Collect unique GitHub logins across all repos
  const loginMap = new Map<string, GitHubContributor>();

  for (const repo of groupRepos) {
    const parsed = parseGitHubUrl(repo.url);
    if (!parsed) continue;

    const { owner, repo: repoName } = parsed;

    try {
      // Gather logins from: contributors, PR authors, PR reviewers, commenters
      // Use the contributors endpoint as primary source — it covers commit authors
      const { data: contributors } = await octokit.repos.listContributors({
        owner,
        repo: repoName,
        per_page: 100,
      });

      for (const c of contributors) {
        if (!c.login || c.type === "Bot") continue;
        if (!loginMap.has(c.login)) {
          loginMap.set(c.login, {
            login: c.login,
            avatarUrl: c.avatar_url ?? "",
            profileUrl: c.html_url ?? `https://github.com/${c.login}`,
            email: null,
          });
        }
      }

      // Also gather PR participants (reviewers, commenters) who may not have commits
      let page = 1;
      while (true) {
        const { data: prs } = await octokit.pulls.list({
          owner,
          repo: repoName,
          state: "all",
          per_page: 100,
          page,
        });
        if (prs.length === 0) break;

        for (const pr of prs) {
          // PR author
          if (
            pr.user?.login &&
            pr.user.type !== "Bot" &&
            !loginMap.has(pr.user.login)
          ) {
            loginMap.set(pr.user.login, {
              login: pr.user.login,
              avatarUrl: pr.user.avatar_url ?? "",
              profileUrl:
                pr.user.html_url ?? `https://github.com/${pr.user.login}`,
              email: null,
            });
          }
        }

        // Fetch reviewers for this page
        for (const pr of prs) {
          const { data: reviews } = await octokit.pulls.listReviews({
            owner,
            repo: repoName,
            pull_number: pr.number,
            per_page: 100,
          });
          for (const r of reviews) {
            if (!r.user?.login || r.user.type === "Bot") continue;
            if (!loginMap.has(r.user.login)) {
              loginMap.set(r.user.login, {
                login: r.user.login,
                avatarUrl: r.user.avatar_url ?? "",
                profileUrl:
                  r.user.html_url ?? `https://github.com/${r.user.login}`,
                email: null,
              });
            }
          }
        }

        if (prs.length < 100) break;
        page++;
      }
    } catch {
      // Skip repos we can't access (private repos, wrong token, etc.)
    }
  }

  // Fetch public profile emails for all contributors in parallel
  await Promise.all(
    Array.from(loginMap.values()).map(async (c) => {
      try {
        const { data } = await octokit.users.getByUsername({
          username: c.login,
        });
        c.email = data.email ?? null;
      } catch {
        c.email = null;
      }
    })
  );

  const contributors = Array.from(loginMap.values()).sort((a, b) =>
    a.login.localeCompare(b.login)
  );

  return NextResponse.json({
    contributors,
    students: groupStudents,
  } satisfies GitHubContributorsResponse);
}
