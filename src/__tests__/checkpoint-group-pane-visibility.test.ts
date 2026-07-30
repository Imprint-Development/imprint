import { describe, expect, it } from "vitest";
import {
  shouldLoadCheckpointGroupPaneData,
  shouldRenderCheckpointGroupsPane,
} from "@/app/(dashboard)/courses/[courseId]/checkpoints/[checkpointId]/checkpoint-group-pane-visibility";
import type { GroupPaneData } from "@/app/(dashboard)/courses/[courseId]/checkpoints/[checkpointId]/CheckpointGroupsPane";

function makeGroup(overrides: Partial<GroupPaneData> = {}): GroupPaneData {
  return {
    groupId: "group-1",
    groupName: "Group 1",
    studentCount: 2,
    analysedAt: null,
    executedPipelines: [],
    analysisRows: [],
    repoWarnings: [],
    reviewWarnings: [],
    logWarningCount: 0,
    warnLogs: [],
    aiReports: [],
    checkpointStatus: "pending",
    ...overrides,
  };
}

describe("checkpoint group pane visibility", () => {
  it("loads group pane data once a checkpoint run has started", () => {
    expect(shouldLoadCheckpointGroupPaneData("pending")).toBe(false);
    expect(shouldLoadCheckpointGroupPaneData("analyzing")).toBe(true);
    expect(shouldLoadCheckpointGroupPaneData("complete")).toBe(true);
    expect(shouldLoadCheckpointGroupPaneData("failed")).toBe(true);
  });

  it("renders the pane for complete checkpoints even when a group has no rows", () => {
    expect(shouldRenderCheckpointGroupsPane("complete", [makeGroup()])).toBe(
      true
    );
  });

  it("renders the pane during analyzing when prior group results still exist", () => {
    expect(
      shouldRenderCheckpointGroupsPane("analyzing", [
        makeGroup({
          analysisRows: [
            {
              studentName: "Ada",
              repoId: "repo-1",
              repoUrl: "https://github.com/example/repo-1",
              codeMetrics: { commits: 3 },
              testMetrics: {},
              reviewMetrics: {},
            },
          ],
        }),
      ])
    ).toBe(true);
  });

  it("keeps the pane hidden during an initial analyzing run with no saved results", () => {
    expect(shouldRenderCheckpointGroupsPane("analyzing", [makeGroup()])).toBe(
      false
    );
  });
});
