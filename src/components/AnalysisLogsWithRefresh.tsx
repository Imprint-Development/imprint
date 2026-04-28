"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import AnalysisLogs, { type LogGroup } from "./AnalysisLogs";

interface Props {
  checkpointId: string;
  groups: LogGroup[];
  pipelines: string[];
  defaultGroupId?: string;
  initialStatus: string;
}

/**
 * Wraps AnalysisLogs with a router.refresh() call when the analysis
 * transitions out of the "analyzing" state, so the server-rendered
 * checkpoint page picks up the new status.
 */
export default function AnalysisLogsWithRefresh({
  checkpointId,
  groups,
  pipelines,
  defaultGroupId,
  initialStatus,
}: Props) {
  const router = useRouter();

  const handleStatusChange = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <AnalysisLogs
      checkpointId={checkpointId}
      groups={groups}
      pipelines={pipelines}
      defaultGroupId={defaultGroupId}
      initialStatus={initialStatus}
      onStatusChange={handleStatusChange}
    />
  );
}
