"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";

interface LogEntry {
  id: string;
  pipeline: string;
  level: string;
  message: string;
  groupId: string | null;
  createdAt: string;
}

interface Props {
  checkpointId: string;
  /** When set, only logs for this group are shown */
  groupId?: string;
  /** Initial status from server render; component will poll for updates */
  initialStatus: string;
  /** Called when status transitions out of "analyzing" */
  onStatusChange?: (newStatus: string) => void;
}

export const LEVEL_COLOR: Record<string, string> = {
  info: "#e2e8f0",
  warn: "#fbbf24",
  error: "#f87171",
};

const POLL_INTERVAL_MS = 2000;

export default function AnalysisLogs({
  checkpointId,
  groupId,
  initialStatus,
  onStatusChange,
}: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  });

  const logsUrl = groupId
    ? `/api/checkpoints/${checkpointId}/logs?groupId=${groupId}`
    : `/api/checkpoints/${checkpointId}/logs`;

  const applyResponse = useCallback(
    (data: { status: string; logs: LogEntry[] }) => {
      setLogs(data.logs);
      if (data.status !== status) {
        setStatus(data.status);
        if (status === "analyzing") {
          onStatusChangeRef.current?.(data.status);
        }
      }
    },
    // status intentionally excluded: we only want the setter, not a re-render loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logsUrl]
  );

  // One-time fetch on mount (and whenever the URL changes) to load existing logs
  useEffect(() => {
    let active = true;
    fetch(logsUrl)
      .then((r) => r.json())
      .then((data: { status: string; logs: LogEntry[] }) => {
        if (!active) return;
        applyResponse(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [logsUrl, applyResponse]);

  // Polling interval — only runs while analyzing
  useEffect(() => {
    if (status !== "analyzing") return;

    let active = true;
    const id = setInterval(async () => {
      try {
        const res = await fetch(logsUrl);
        if (!res.ok || !active) return;
        const data = (await res.json()) as { status: string; logs: LogEntry[] };
        if (!active) return;
        setLogs(data.logs);
        if (data.status !== "analyzing") {
          setStatus(data.status);
          onStatusChangeRef.current?.(data.status);
        }
      } catch {
        // silently ignore fetch errors during polling
      }
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [status, logsUrl]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
          Analysis Logs
        </Typography>
        {(status === "analyzing" || loading) && <CircularProgress size={14} />}
      </Stack>
      <Box
        ref={scrollRef}
        sx={{
          fontFamily: "monospace",
          fontSize: "0.75rem",
          bgcolor: "grey.900",
          color: "grey.100",
          borderRadius: 1,
          p: 1.5,
          minHeight: 48,
          maxHeight: 420,
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {logs.map((entry) => (
          <Box
            key={entry.id}
            component="div"
            sx={{ color: LEVEL_COLOR[entry.level] ?? "text.primary", mb: 0.25 }}
          >
            <Box component="span" sx={{ color: "grey.500", mr: 1 }}>
              {new Date(entry.createdAt).toLocaleTimeString()}
            </Box>
            <Box component="span" sx={{ color: "info.light", mr: 1 }}>
              [{entry.pipeline}]
            </Box>
            {entry.message}
          </Box>
        ))}
        {!loading && logs.length === 0 && status === "analyzing" && (
          <Typography variant="caption" sx={{ color: "grey.500" }}>
            Waiting for worker…
          </Typography>
        )}
        {!loading && logs.length === 0 && status !== "analyzing" && (
          <Typography variant="caption" sx={{ color: "grey.500" }}>
            No logs available.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
