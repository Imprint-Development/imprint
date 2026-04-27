"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import AnalysisLogs from "./AnalysisLogs";

interface Props {
  checkpointId: string;
  groupId?: string;
  initialStatus: string;
}

/**
 * Wraps AnalysisLogs with a router.refresh() call when the analysis
 * transitions out of the "analyzing" state, so the server-rendered
 * checkpoint page picks up the new status.
 */
export default function AnalysisLogsWithRefresh({
  checkpointId,
  groupId,
  initialStatus,
}: Props) {
  const router = useRouter();

  const handleStatusChange = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <AnalysisLogs
      checkpointId={checkpointId}
      groupId={groupId}
      initialStatus={initialStatus}
      onStatusChange={handleStatusChange}
    />
  );
}
