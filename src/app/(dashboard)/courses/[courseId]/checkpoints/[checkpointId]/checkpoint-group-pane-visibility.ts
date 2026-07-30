import type { GroupPaneData } from "./CheckpointGroupsPane";

export function shouldLoadCheckpointGroupPaneData(status: string): boolean {
  return status !== "pending";
}

function hasPersistedCheckpointGroupResults(groups: GroupPaneData[]): boolean {
  return groups.some(
    (group) =>
      group.analysedAt !== null ||
      group.executedPipelines.length > 0 ||
      group.analysisRows.length > 0 ||
      group.repoWarnings.length > 0 ||
      group.reviewWarnings.length > 0 ||
      group.logWarningCount > 0 ||
      group.warnLogs.length > 0 ||
      group.aiReports.length > 0
  );
}

export function shouldRenderCheckpointGroupsPane(
  status: string,
  groups: GroupPaneData[]
): boolean {
  if (status === "complete") return true;
  if (status === "pending") return false;

  return hasPersistedCheckpointGroupResults(groups);
}
