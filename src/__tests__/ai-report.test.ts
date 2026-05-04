import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  callLlm,
  formatMetrics,
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
} from "@/lib/analysis/pipelines/ai-report";

// ---------------------------------------------------------------------------
// Mock OpenAI and Anthropic SDKs
// ---------------------------------------------------------------------------

const mockOpenAiCreate = vi.fn();
const mockAnthropicCreate = vi.fn();

vi.mock("openai", () => {
  return {
    // Must be a regular function (not arrow) so it can be used as a constructor
    default: vi.fn().mockImplementation(function () {
      return {
        chat: {
          completions: {
            create: mockOpenAiCreate,
          },
        },
      };
    }),
  };
});

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        messages: {
          create: mockAnthropicCreate,
        },
      };
    }),
  };
});

// We don't import DB in these tests — mock it at module level so the import
// of ai-report.ts doesn't try to connect.
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

// ---------------------------------------------------------------------------
// callLlm
// ---------------------------------------------------------------------------

describe("callLlm", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockOpenAiCreate.mockReset();
    mockAnthropicCreate.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(callLlm("openai", "gpt-4o", "system", "user")).rejects.toThrow(
      "OPENAI_API_KEY"
    );
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(
      callLlm("anthropic", "claude-sonnet-4-5", "system", "user")
    ).rejects.toThrow("ANTHROPIC_API_KEY");
  });

  it("calls OpenAI with the correct messages and returns content", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mockOpenAiCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "OpenAI response" } }],
    });

    const result = await callLlm("openai", "gpt-4o", "sys prompt", "user msg");

    expect(result).toBe("OpenAI response");
    expect(mockOpenAiCreate).toHaveBeenCalledWith({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "sys prompt" },
        { role: "user", content: "user msg" },
      ],
    });
  });

  it("calls Anthropic with the correct messages and returns content", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Anthropic response" }],
    });

    const result = await callLlm(
      "anthropic",
      "claude-sonnet-4-5",
      "sys prompt",
      "user msg"
    );

    expect(result).toBe("Anthropic response");
    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-5",
        system: "sys prompt",
        messages: [{ role: "user", content: "user msg" }],
      })
    );
  });

  it("passes a custom baseUrl to the OpenAI client constructor", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mockOpenAiCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "ok" } }],
    });

    const OpenAI = (await import("openai")).default as unknown as ReturnType<
      typeof vi.fn
    >;
    OpenAI.mockClear();

    await callLlm(
      "openai",
      "gpt-4o",
      "sys",
      "user",
      "https://openrouter.ai/api/v1"
    );

    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "https://openrouter.ai/api/v1" })
    );
  });

  it("passes a custom baseUrl to the Anthropic client constructor", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "ok" }],
    });

    const Anthropic = (await import("@anthropic-ai/sdk"))
      .default as unknown as ReturnType<typeof vi.fn>;
    Anthropic.mockClear();

    await callLlm(
      "anthropic",
      "claude-sonnet-4-5",
      "sys",
      "user",
      "http://localhost:11434/v1"
    );

    expect(Anthropic).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "http://localhost:11434/v1" })
    );
  });

  it("returns empty string when OpenAI response has no choices", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mockOpenAiCreate.mockResolvedValueOnce({ choices: [] });

    const result = await callLlm("openai", "gpt-4o", "sys", "user");
    expect(result).toBe("");
  });

  it("returns empty string when Anthropic response content block is not text", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "x", name: "fn", input: {} }],
    });

    const result = await callLlm(
      "anthropic",
      "claude-sonnet-4-5",
      "sys",
      "user"
    );
    expect(result).toBe("");
  });

  it("throws on an unknown provider", async () => {
    await expect(
      // @ts-expect-error intentional bad provider for test
      callLlm("unknown", "model", "sys", "user")
    ).rejects.toThrow("Unknown provider");
  });
});

// ---------------------------------------------------------------------------
// formatMetrics
// ---------------------------------------------------------------------------

describe("formatMetrics", () => {
  it("includes student name", () => {
    const result = formatMetrics("Alice", null, null, null);
    expect(result).toContain("Alice");
  });

  it("formats code metrics correctly", () => {
    const code = {
      commits: 10,
      linesAdded: 500,
      linesRemoved: 100,
      filesChanged: 20,
    };
    const result = formatMetrics("Bob", code, null, null);
    expect(result).toContain("10 commits");
    expect(result).toContain("+500");
    expect(result).toContain("-100");
    expect(result).toContain("20 files changed");
  });

  it("formats test metrics correctly", () => {
    const test = {
      commits: 3,
      linesAdded: 80,
      linesRemoved: 5,
      filesChanged: 4,
    };
    const result = formatMetrics("Carol", null, test, null);
    expect(result).toContain("3 commits");
    expect(result).toContain("+80");
  });

  it("formats review metrics correctly", () => {
    const review = {
      prsReviewed: 5,
      approvals: 3,
      changesRequested: 1,
      reviewComments: 12,
      issueComments: 4,
    };
    const result = formatMetrics("Dave", null, null, review);
    expect(result).toContain("5 PRs reviewed");
    expect(result).toContain("3 approvals");
    expect(result).toContain("12 review comments");
  });

  it("shows 'no data' when metrics are null", () => {
    const result = formatMetrics("Eve", null, null, null);
    expect(result).toContain("no data");
  });

  it("shows 'no data' for empty metrics objects", () => {
    const result = formatMetrics("Frank", {}, {}, {});
    expect(result).toContain("no data");
  });
});

// ---------------------------------------------------------------------------
// Model catalogues
// ---------------------------------------------------------------------------

describe("model catalogues", () => {
  it("OPENAI_MODELS is non-empty and each entry has value and label", () => {
    expect(OPENAI_MODELS.length).toBeGreaterThan(0);
    for (const m of OPENAI_MODELS) {
      expect(m.value).toBeTruthy();
      expect(m.label).toBeTruthy();
    }
  });

  it("ANTHROPIC_MODELS is non-empty and each entry has value and label", () => {
    expect(ANTHROPIC_MODELS.length).toBeGreaterThan(0);
    for (const m of ANTHROPIC_MODELS) {
      expect(m.value).toBeTruthy();
      expect(m.label).toBeTruthy();
    }
  });

  it("all OPENAI_MODELS values are unique", () => {
    const values = OPENAI_MODELS.map((m) => m.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("all ANTHROPIC_MODELS values are unique", () => {
    const values = ANTHROPIC_MODELS.map((m) => m.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
