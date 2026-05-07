import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatGitContext,
  formatGroupSummaryStudentContext,
  formatFileTree,
  extractRepoGitContext,
  type RepoGitContext,
} from "@/lib/analysis/pipelines/ai-report";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/db/schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/schema")>();
  return {
    ...actual,
    courses: {},
    students: {},
    repositories: {},
    checkpointAnalyses: {},
    aiReports: {},
  };
});
vi.mock("openai", () => ({ default: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn() }));

const mockClone = vi.fn().mockResolvedValue(undefined);
const mockCheckout = vi.fn().mockResolvedValue(undefined);
const mockRaw = vi.fn();

vi.mock("simple-git", () => ({
  default: vi.fn(() => ({
    clone: mockClone,
    checkout: mockCheckout,
    raw: mockRaw,
  })),
}));

vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const noop = vi.fn().mockResolvedValue(undefined);

function makeEmailMap(entries: [string, string[]][]) {
  return new Map(entries);
}

/**
 * Builds the sequence of raw() responses the new implementation makes:
 *  1. git log (all commits, one line per commit)
 *  2. for each matched commit: git show --patch --stat --no-color <hash>
 *  3. git ls-tree -r --name-only HEAD
 */
function setupRawResponses(options: {
  logOutput: string;
  showOutputs: string[]; // one per matched commit
  lsTreeOutput: string;
}) {
  mockRaw.mockReset();
  mockRaw.mockResolvedValueOnce(options.logOutput);
  for (const s of options.showOutputs) {
    mockRaw.mockResolvedValueOnce(s);
  }
  mockRaw.mockResolvedValueOnce(options.lsTreeOutput);
}

/** A minimal but realistic `git show --patch --stat` output. */
function makeShowOutput(opts: {
  stat?: string;
  files?: { path: string; diff: string }[];
}) {
  const stat = opts.stat ?? "1 file changed, 5 insertions(+)";
  const fileDiffs = (opts.files ?? [])
    .map(
      ({ path: p, diff }) =>
        `diff --git a/${p} b/${p}\n--- a/${p}\n+++ b/${p}\n${diff}`
    )
    .join("\n");
  return `commit abc\nAuthor: ...\n\n    message\n\n${stat}\n\n${fileDiffs}`;
}

// ---------------------------------------------------------------------------
// formatGitContext
// ---------------------------------------------------------------------------

describe("formatGitContext", () => {
  const ctx: RepoGitContext = {
    repoUrl: "https://github.com/org/repo",
    commitsByStudent: {
      "student-1": [
        {
          hash: "abc12345",
          date: "2024-03-01T10:00:00Z",
          message: "feat: add login",
          stat: "3 files changed, 80 insertions(+)",
          diff: "diff --git a/src/login.ts b/src/login.ts\n+export function login() {}",
        },
        {
          hash: "def67890",
          date: "2024-03-05T14:00:00Z",
          message: "fix: null pointer",
          stat: "1 file changed, 2 insertions(+), 1 deletion(-)",
          diff: "diff --git a/src/utils.ts b/src/utils.ts\n-const x = null\n+const x = undefined",
        },
      ],
      "student-2": [],
    },
    filesByStudent: {
      "student-1": ["src/login.ts", "src/utils.ts", "README.md"],
      "student-2": [],
    },
    fileTree: "src/login.ts\nsrc/utils.ts\nREADME.md",
  };

  it("lists all commits with hash, date and message", () => {
    const result = formatGitContext("student-1", ctx);
    expect(result).toContain("abc12345");
    expect(result).toContain("feat: add login");
    expect(result).toContain("def67890");
    expect(result).toContain("fix: null pointer");
  });

  it("includes the stat summary for each commit", () => {
    const result = formatGitContext("student-1", ctx);
    expect(result).toContain("3 files changed, 80 insertions(+)");
    expect(result).toContain("1 file changed, 2 insertions(+), 1 deletion(-)");
  });

  it("includes the full diff for each commit", () => {
    const result = formatGitContext("student-1", ctx);
    expect(result).toContain("diff --git a/src/login.ts");
    expect(result).toContain("+export function login()");
    expect(result).toContain("-const x = null");
    expect(result).toContain("+const x = undefined");
  });

  it("shows the date truncated to YYYY-MM-DD", () => {
    const result = formatGitContext("student-1", ctx);
    expect(result).toContain("2024-03-01");
    expect(result).toContain("2024-03-05");
  });

  it("lists touched files", () => {
    const result = formatGitContext("student-1", ctx);
    expect(result).toContain("src/login.ts");
    expect(result).toContain("README.md");
  });

  it("reports commit count in header", () => {
    const result = formatGitContext("student-1", ctx);
    expect(result).toContain("2 total");
  });

  it("returns a no-commits message when student has no commits", () => {
    const result = formatGitContext("student-2", ctx);
    expect(result).toMatch(/no commits/i);
  });

  it("returns a no-commits message when student is not in context", () => {
    const result = formatGitContext("unknown-student", ctx);
    expect(result).toMatch(/no commits/i);
  });

  it("caps file list at 60 and shows overflow count", () => {
    const manyFiles = Array.from({ length: 80 }, (_, i) => `src/file${i}.ts`);
    const bigCtx: RepoGitContext = {
      ...ctx,
      filesByStudent: { "student-1": manyFiles },
    };
    const result = formatGitContext("student-1", bigCtx);
    expect(result).toContain("20 more");
    expect(result).toContain("src/file0.ts");
    expect(result).toContain("src/file59.ts");
    expect(result).not.toContain("src/file60.ts");
  });
});

// ---------------------------------------------------------------------------
// formatGroupSummaryStudentContext
// ---------------------------------------------------------------------------

describe("formatGroupSummaryStudentContext", () => {
  const ctx: RepoGitContext = {
    repoUrl: "https://github.com/org/repo",
    commitsByStudent: {
      "student-1": [
        {
          hash: "abc12345",
          date: "2024-03-01T10:00:00Z",
          message: "feat: add login",
          stat: "3 files changed, 80 insertions(+)",
          diff: "diff --git a/src/login.ts b/src/login.ts\n+export function login() {}",
        },
        {
          hash: "def67890",
          date: "2024-03-05T14:00:00Z",
          message: "fix: null pointer",
          stat: "1 file changed, 2 insertions(+), 1 deletion(-)",
          diff: "diff --git a/src/utils.ts b/src/utils.ts\n-const x = null\n+const x = undefined",
        },
      ],
      "student-2": [],
    },
    filesByStudent: {
      "student-1": ["src/login.ts", "src/utils.ts", "README.md"],
      "student-2": [],
    },
    fileTree: "src/login.ts\nsrc/utils.ts\nREADME.md",
  };

  it("returns concise context without embedding diffs", () => {
    const result = formatGroupSummaryStudentContext("student-1", ctx);
    expect(result).toContain("Commits: 2 total");
    expect(result).toContain("feat: add login");
    expect(result).toContain("Files touched (3 unique):");
    expect(result).not.toContain("diff --git");
  });

  it("returns a no-commits message when no commits exist", () => {
    const result = formatGroupSummaryStudentContext("student-2", ctx);
    expect(result).toMatch(/no commits/i);
  });

  it("caps commit and file lists and reports overflow", () => {
    const bigCtx: RepoGitContext = {
      ...ctx,
      commitsByStudent: {
        "student-1": Array.from({ length: 20 }, (_, i) => ({
          hash: `hash-${i}`,
          date: "2024-03-01T10:00:00Z",
          message: `commit ${i}`,
          stat: "",
          diff: `diff --git a/src/file${i}.ts b/src/file${i}.ts\n+line`,
        })),
      },
      filesByStudent: {
        "student-1": Array.from({ length: 50 }, (_, i) => `src/file${i}.ts`),
      },
    };

    const result = formatGroupSummaryStudentContext("student-1", bigCtx);
    expect(result).toContain("20 total");
    expect(result).toContain("and 5 more commits");
    expect(result).toContain("and 10 more files");
    expect(result).toContain("commit 14");
    expect(result).not.toContain("commit 15");
    expect(result).toContain("src/file39.ts");
    expect(result).not.toContain("src/file40.ts");
  });
});

// ---------------------------------------------------------------------------
// formatFileTree
// ---------------------------------------------------------------------------

describe("formatFileTree", () => {
  it("returns the full tree when under the limit", () => {
    const tree = "src/a.ts\nsrc/b.ts\nsrc/c.ts";
    expect(formatFileTree(tree, 200)).toBe(tree);
  });

  it("truncates and appends overflow count when over the limit", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `src/file${i}.ts`);
    const tree = lines.join("\n");
    const result = formatFileTree(tree, 30);
    expect(result).toContain("src/file0.ts");
    expect(result).toContain("src/file29.ts");
    expect(result).not.toContain("src/file30.ts");
    expect(result).toContain("20 more files");
  });

  it("handles an empty tree gracefully", () => {
    expect(formatFileTree("", 200)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// extractRepoGitContext
// ---------------------------------------------------------------------------

describe("extractRepoGitContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    noop.mockClear();
  });

  it("assigns commits to the correct student by email", async () => {
    setupRawResponses({
      logOutput: [
        "alice@example.com|||aaaa1111|||2024-03-01T10:00:00Z|||feat: initial commit",
        "bob@example.com|||bbbb2222|||2024-03-02T11:00:00Z|||fix: typo",
      ].join("\n"),
      showOutputs: [
        makeShowOutput({
          stat: "2 files changed, 40 insertions(+)",
          files: [{ path: "src/main.ts", diff: "+const x = 1" }],
        }),
        makeShowOutput({
          stat: "1 file changed, 2 insertions(+), 1 deletion(-)",
          files: [{ path: "README.md", diff: "+updated" }],
        }),
      ],
      lsTreeOutput: "src/main.ts\nREADME.md",
    });

    const emailMap = makeEmailMap([
      ["student-alice", ["alice@example.com"]],
      ["student-bob", ["bob@example.com"]],
    ]);

    const result = await extractRepoGitContext(
      "https://github.com/org/repo",
      "main",
      null,
      null,
      emailMap,
      noop
    );

    expect(result).not.toBeNull();
    expect(result!.commitsByStudent["student-alice"]).toHaveLength(1);
    expect(result!.commitsByStudent["student-alice"]![0]!.message).toBe(
      "feat: initial commit"
    );
    expect(result!.commitsByStudent["student-bob"]).toHaveLength(1);
    expect(result!.commitsByStudent["student-bob"]![0]!.message).toBe(
      "fix: typo"
    );
  });

  it("stores the diff on each commit entry", async () => {
    setupRawResponses({
      logOutput:
        "alice@example.com|||aaaa1111|||2024-03-01T10:00:00Z|||feat: stuff",
      showOutputs: [
        makeShowOutput({
          files: [{ path: "src/index.ts", diff: "+export const foo = 1" }],
        }),
      ],
      lsTreeOutput: "src/index.ts",
    });

    const result = await extractRepoGitContext(
      "https://github.com/org/repo",
      null,
      null,
      null,
      makeEmailMap([["student-alice", ["alice@example.com"]]]),
      noop
    );

    const commit = result!.commitsByStudent["student-alice"]![0]!;
    expect(commit.diff).toContain("diff --git a/src/index.ts");
    expect(commit.diff).toContain("+export const foo = 1");
  });

  it("strips lockfile hunks from diffs", async () => {
    const showOutput =
      makeShowOutput({
        files: [{ path: "src/app.ts", diff: "+const x = 1" }],
      }) +
      "\ndiff --git a/package-lock.json b/package-lock.json\n+lots of lock content";

    setupRawResponses({
      logOutput:
        "alice@example.com|||aaaa1111|||2024-03-01T10:00:00Z|||chore: update deps",
      showOutputs: [showOutput],
      lsTreeOutput: "src/app.ts\npackage-lock.json",
    });

    const result = await extractRepoGitContext(
      "https://github.com/org/repo",
      null,
      null,
      null,
      makeEmailMap([["student-alice", ["alice@example.com"]]]),
      noop
    );

    const diff = result!.commitsByStudent["student-alice"]![0]!.diff;
    expect(diff).toContain("src/app.ts");
    expect(diff).not.toContain("package-lock.json");
    expect(diff).not.toContain("lots of lock content");
  });

  it("also strips yarn.lock, pnpm-lock.yaml and *.min.js", async () => {
    const ignored = ["yarn.lock", "pnpm-lock.yaml", "dist/bundle.min.js"];
    const showOutput = ignored
      .map((f) => `diff --git a/${f} b/${f}\n+ignored content`)
      .join("\n");

    setupRawResponses({
      logOutput:
        "alice@example.com|||aaaa1111|||2024-03-01T10:00:00Z|||chore: locks",
      showOutputs: [showOutput],
      lsTreeOutput: ignored.join("\n"),
    });

    const result = await extractRepoGitContext(
      "https://github.com/org/repo",
      null,
      null,
      null,
      makeEmailMap([["student-alice", ["alice@example.com"]]]),
      noop
    );

    const diff = result!.commitsByStudent["student-alice"]![0]!.diff;
    for (const f of ignored) {
      expect(diff).not.toContain(f);
    }
  });

  it("truncates diffs exceeding 150 lines and appends overflow annotation", async () => {
    const bigDiff =
      "diff --git a/src/big.ts b/src/big.ts\n" +
      Array.from({ length: 200 }, (_, i) => `+line ${i}`).join("\n");

    setupRawResponses({
      logOutput:
        "alice@example.com|||aaaa1111|||2024-03-01T10:00:00Z|||feat: big",
      showOutputs: [bigDiff],
      lsTreeOutput: "src/big.ts",
    });

    const result = await extractRepoGitContext(
      "https://github.com/org/repo",
      null,
      null,
      null,
      makeEmailMap([["student-alice", ["alice@example.com"]]]),
      noop
    );

    const diff = result!.commitsByStudent["student-alice"]![0]!.diff;
    expect(diff).toContain("truncated");
    expect(diff).toContain("more lines");
    // Should not contain lines beyond the cap
    expect(diff).not.toContain("+line 199");
  });

  it("caps commits per student at 100 and keeps the newest", async () => {
    // 105 commits from the same student — git log returns newest first
    const logLines = Array.from(
      { length: 105 },
      (_, i) =>
        `alice@example.com|||hash${String(i).padStart(4, "0")}|||2024-03-${String((i % 28) + 1).padStart(2, "0")}T10:00:00Z|||commit ${i}`
    );

    mockRaw.mockReset();
    mockRaw.mockResolvedValueOnce(logLines.join("\n"));
    // Provide 100 show responses (the cap) + ls-tree
    for (let i = 0; i < 100; i++) {
      mockRaw.mockResolvedValueOnce(makeShowOutput({}));
    }
    mockRaw.mockResolvedValueOnce("src/file.ts");

    const result = await extractRepoGitContext(
      "https://github.com/org/repo",
      null,
      null,
      null,
      makeEmailMap([["student-alice", ["alice@example.com"]]]),
      noop
    );

    expect(result!.commitsByStudent["student-alice"]).toHaveLength(100);
    // First commit in log (index 0, newest) should be present
    expect(result!.commitsByStudent["student-alice"]![0]!.message).toBe(
      "commit 0"
    );
    // Commit 100 and beyond should be dropped
    const messages = result!.commitsByStudent["student-alice"]!.map(
      (c) => c.message
    );
    expect(messages).not.toContain("commit 100");
  });

  it("matches commits to students using secondary git emails", async () => {
    setupRawResponses({
      logOutput:
        "alice-work@corp.com|||cccc3333|||2024-03-03T09:00:00Z|||refactor: cleanup",
      showOutputs: [
        makeShowOutput({ files: [{ path: "src/cleanup.ts", diff: "+clean" }] }),
      ],
      lsTreeOutput: "src/cleanup.ts",
    });

    const result = await extractRepoGitContext(
      "https://github.com/org/repo",
      null,
      null,
      null,
      makeEmailMap([
        ["student-alice", ["alice@example.com", "alice-work@corp.com"]],
      ]),
      noop
    );

    expect(result!.commitsByStudent["student-alice"]).toHaveLength(1);
    expect(result!.commitsByStudent["student-alice"]![0]!.hash).toBe(
      "cccc3333"
    );
  });

  it("ignores commits from unknown authors", async () => {
    setupRawResponses({
      logOutput: [
        "alice@example.com|||aaaa1111|||2024-03-01T10:00:00Z|||feat: known",
        "stranger@other.com|||eeee5555|||2024-03-02T10:00:00Z|||feat: unknown",
      ].join("\n"),
      showOutputs: [makeShowOutput({})], // only one matched commit gets a show call
      lsTreeOutput: "src/known.ts",
    });

    const result = await extractRepoGitContext(
      "https://github.com/org/repo",
      null,
      null,
      null,
      makeEmailMap([["student-alice", ["alice@example.com"]]]),
      noop
    );

    expect(result!.commitsByStudent["student-alice"]).toHaveLength(1);
    expect(Object.keys(result!.commitsByStudent)).not.toContain(
      "stranger@other.com"
    );
  });

  it("collects unique files touched per student, excluding ignored files", async () => {
    setupRawResponses({
      logOutput: [
        "alice@example.com|||aaaa1111|||2024-03-01T10:00:00Z|||feat: first",
        "alice@example.com|||bbbb2222|||2024-03-02T10:00:00Z|||feat: second",
      ].join("\n"),
      showOutputs: [
        makeShowOutput({
          files: [
            { path: "src/a.ts", diff: "+a" },
            { path: "src/b.ts", diff: "+b" },
          ],
        }),
        makeShowOutput({
          files: [
            { path: "src/b.ts", diff: "+b2" },
            { path: "package-lock.json", diff: "+lock" },
          ],
        }),
      ],
      lsTreeOutput: "src/a.ts\nsrc/b.ts\npackage-lock.json",
    });

    const result = await extractRepoGitContext(
      "https://github.com/org/repo",
      null,
      null,
      null,
      makeEmailMap([["student-alice", ["alice@example.com"]]]),
      noop
    );

    const files = result!.filesByStudent["student-alice"]!;
    expect(files).toContain("src/a.ts");
    expect(files).toContain("src/b.ts");
    // Deduplicated
    expect(files.filter((f) => f === "src/b.ts")).toHaveLength(1);
    // Lockfile excluded
    expect(files).not.toContain("package-lock.json");
  });

  it("includes the repo file tree", async () => {
    setupRawResponses({
      logOutput: "",
      showOutputs: [],
      lsTreeOutput: "src/index.ts\nsrc/utils.ts\npackage.json",
    });

    const result = await extractRepoGitContext(
      "https://github.com/org/repo",
      null,
      null,
      null,
      new Map(),
      noop
    );

    expect(result!.fileTree).toContain("src/index.ts");
    expect(result!.fileTree).toContain("package.json");
  });

  it("checks out gitRef when provided", async () => {
    setupRawResponses({ logOutput: "", showOutputs: [], lsTreeOutput: "" });

    await extractRepoGitContext(
      "https://github.com/org/repo",
      "v1.2.3",
      null,
      null,
      new Map(),
      noop
    );

    expect(mockCheckout).toHaveBeenCalledWith("v1.2.3");
  });

  it("skips checkout when gitRef is null", async () => {
    setupRawResponses({ logOutput: "", showOutputs: [], lsTreeOutput: "" });

    await extractRepoGitContext(
      "https://github.com/org/repo",
      null,
      null,
      null,
      new Map(),
      noop
    );

    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it("returns null and logs a warning when clone fails", async () => {
    mockClone.mockRejectedValueOnce(new Error("authentication failed"));

    const result = await extractRepoGitContext(
      "https://github.com/org/private-repo",
      null,
      null,
      null,
      new Map(),
      noop
    );

    expect(result).toBeNull();
    expect(noop).toHaveBeenCalledWith(
      "warn",
      expect.stringContaining("authentication failed")
    );
  });

  it("passes date range flags to git log when dates are provided", async () => {
    setupRawResponses({ logOutput: "", showOutputs: [], lsTreeOutput: "" });

    const start = new Date("2024-03-01T00:00:00Z");
    const end = new Date("2024-03-31T23:59:59Z");

    await extractRepoGitContext(
      "https://github.com/org/repo",
      null,
      start,
      end,
      new Map(),
      noop
    );

    const logCall = mockRaw.mock.calls[0] as string[][];
    expect(logCall[0]).toContain(`--after=${start.toISOString()}`);
    expect(logCall[0]).toContain(`--before=${end.toISOString()}`);
  });
});
