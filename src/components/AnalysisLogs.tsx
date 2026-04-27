"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

interface LogEntry {
  id: string;
  pipeline: string;
  level: string;
  message: string;
  groupId: string | null;
  createdAt: string;
}

export interface LogGroup {
  id: string;
  name: string;
}

interface Props {
  checkpointId: string;
  /** Available groups for the filter dropdown */
  groups: LogGroup[];
  /** Available pipeline IDs for the filter dropdown */
  pipelines: string[];
  /** Pre-select a group (e.g. when rendered on a group-scoped page) */
  defaultGroupId?: string;
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

const LOG_LEVELS = ["info", "warn", "error"] as const;

const POLL_INTERVAL_MS = 2000;

export default function AnalysisLogs({
  checkpointId,
  groups,
  pipelines,
  defaultGroupId,
  initialStatus,
  onStatusChange,
}: Props) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    defaultGroupId ?? ""
  );
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState(initialStatus);
  // fetching: true while a fetch is in-flight; toggled only inside async callbacks
  const [fetching, setFetching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  });

  // Both group and pipeline must be selected before we fetch anything
  const canFetch = selectedGroupId !== "" && selectedPipeline !== "";

  const logsUrl = canFetch
    ? (() => {
        const url = new URL(
          `/api/checkpoints/${checkpointId}/logs`,
          window.location.origin
        );
        url.searchParams.set("groupId", selectedGroupId);
        url.searchParams.set("pipeline", selectedPipeline);
        if (selectedLevel) url.searchParams.set("level", selectedLevel);
        return url.toString();
      })()
    : null;

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

  // Fetch whenever the URL changes (i.e. any filter changes).
  // setFetching(true) is called inside the microtask (Promise callback) to
  // avoid the react-hooks/set-state-in-effect synchronous setState restriction.
  useEffect(() => {
    if (!logsUrl) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) setFetching(true);
    });
    fetch(logsUrl)
      .then((r) => r.json())
      .then((data: { status: string; logs: LogEntry[] }) => {
        if (!active) return;
        applyResponse(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setFetching(false);
      });
    return () => {
      active = false;
    };
  }, [logsUrl, applyResponse]);

  // Polling — only while analyzing and a filter is selected
  useEffect(() => {
    if (status !== "analyzing" || !logsUrl) return;

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

  // Don't show stale logs from a previous selection when filters are cleared
  const displayLogs = canFetch ? logs : [];

  return (
    <Box>
      {/* Filter controls */}
      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Group</InputLabel>
          <Select
            value={selectedGroupId}
            label="Group"
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            {groups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Pipeline</InputLabel>
          <Select
            value={selectedPipeline}
            label="Pipeline"
            onChange={(e) => setSelectedPipeline(e.target.value)}
          >
            {pipelines.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Level</InputLabel>
          <Select
            value={selectedLevel}
            label="Level"
            displayEmpty
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            <MenuItem value="">All levels</MenuItem>
            {LOG_LEVELS.map((l) => (
              <MenuItem key={l} value={l}>
                {l}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Log header */}
      <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
          Analysis Logs
        </Typography>
        {(status === "analyzing" || fetching) && canFetch && (
          <CircularProgress size={14} />
        )}
      </Stack>

      {/* Log output */}
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
        {!canFetch && (
          <Typography variant="caption" sx={{ color: "grey.500" }}>
            Select a group and pipeline to view logs.
          </Typography>
        )}
        {canFetch && fetching && displayLogs.length === 0 && (
          <Typography variant="caption" sx={{ color: "grey.500" }}>
            Loading…
          </Typography>
        )}
        {canFetch &&
          !fetching &&
          displayLogs.length === 0 &&
          status === "analyzing" && (
            <Typography variant="caption" sx={{ color: "grey.500" }}>
              Waiting for worker…
            </Typography>
          )}
        {canFetch &&
          !fetching &&
          displayLogs.length === 0 &&
          status !== "analyzing" && (
            <Typography variant="caption" sx={{ color: "grey.500" }}>
              No logs available for this selection.
            </Typography>
          )}
        {displayLogs.map((entry) => (
          <Box
            key={entry.id}
            component="div"
            sx={{ color: LEVEL_COLOR[entry.level] ?? "grey.100", mb: 0.25 }}
          >
            <Box component="span" sx={{ color: "grey.500", mr: 1 }}>
              {new Date(entry.createdAt).toLocaleTimeString()}
            </Box>
            {entry.message}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
