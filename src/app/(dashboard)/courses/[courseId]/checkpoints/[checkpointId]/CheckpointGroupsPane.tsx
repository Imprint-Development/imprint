"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import AppLink from "@/components/AppLink";
import {
  GroupAnalysisClient,
  type AnalysisRow,
  type RepoWarning,
  type ReviewWarning,
} from "../../groups/[groupId]/checkpoints/[checkpointId]/GroupAnalysisClient";

export interface WarnLog {
  pipeline: string;
  level: string;
  message: string;
  repoUrl: string | null;
}

export interface GroupPaneData {
  groupId: string;
  groupName: string;
  studentCount: number;
  analysedAt: Date | null;
  executedPipelines: string[];
  analysisRows: AnalysisRow[];
  repoWarnings: RepoWarning[];
  reviewWarnings: ReviewWarning[];
  logWarningCount: number;
  warnLogs: WarnLog[];
}

interface Props {
  groups: GroupPaneData[];
  courseId: string;
  checkpointId: string;
}

function shortRepoLabel(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "").replace(/\.git$/, "");
  } catch {
    return url;
  }
}

function WarningsModal({
  groupName,
  warnLogs,
  open,
  onClose,
}: {
  groupName: string;
  warnLogs: WarnLog[];
  open: boolean;
  onClose: () => void;
}) {
  const byPipeline = new Map<string, WarnLog[]>();
  for (const log of warnLogs) {
    const list = byPipeline.get(log.pipeline) ?? [];
    list.push(log);
    byPipeline.set(log.pipeline, list);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Warnings — {groupName}</DialogTitle>
      <DialogContent dividers>
        {warnLogs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No warnings.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {[...byPipeline.entries()].map(([pipeline, logs]) => (
              <Box key={pipeline}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    color: "text.secondary",
                    display: "block",
                    mb: 0.75,
                  }}
                >
                  {pipeline}
                </Typography>
                <Stack spacing={1}>
                  {logs.map((log, i) => (
                    <Alert
                      key={i}
                      severity={log.level === "error" ? "error" : "warning"}
                      sx={{ alignItems: "flex-start" }}
                    >
                      {log.repoUrl && (
                        <AlertTitle sx={{ mb: 0.25 }}>
                          {shortRepoLabel(log.repoUrl)}
                        </AlertTitle>
                      )}
                      {log.message}
                    </Alert>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CheckpointGroupsPane({
  groups,
  courseId,
  checkpointId,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>(
    groups[0]?.groupId ?? ""
  );
  const [warningsOpen, setWarningsOpen] = useState(false);

  const selected = groups.find((g) => g.groupId === selectedId) ?? null;

  return (
    <Box>
      {/* Toolbar: group dropdown + meta + actions */}
      <Stack
        direction="row"
        sx={{ alignItems: "center", mb: 2.5, flexWrap: "wrap", gap: 1.5 }}
      >
        {/* Left: meta for selected group */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {selected && (
            <Stack
              direction="row"
              sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}
            >
              {selected.analysedAt && (
                <Typography variant="caption" color="text.secondary">
                  Analysed{" "}
                  {selected.analysedAt.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </Typography>
              )}
              {selected.executedPipelines.map((p) => (
                <Chip key={p} label={p} size="small" variant="outlined" />
              ))}
            </Stack>
          )}
        </Box>

        {/* Right: warnings button + group selector + open link */}
        <Stack
          direction="row"
          sx={{ alignItems: "center", gap: 1, flexShrink: 0 }}
        >
          {selected && selected.logWarningCount > 0 && (
            <Tooltip
              title={`${selected.logWarningCount} warning${selected.logWarningCount !== 1 ? "s" : ""}`}
            >
              <IconButton
                size="small"
                color="warning"
                onClick={() => setWarningsOpen(true)}
              >
                <WarningAmberRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="group-select-label">Group</InputLabel>
            <Select
              labelId="group-select-label"
              label="Group"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {groups.map((g) => (
                <MenuItem key={g.groupId} value={g.groupId}>
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", gap: 1, width: "100%" }}
                  >
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {g.groupName}
                    </Typography>
                    {g.analysisRows.length === 0 && (
                      <Chip label="empty" size="small" color="default" />
                    )}
                    {g.logWarningCount > 0 && (
                      <WarningAmberRounded
                        fontSize="small"
                        color="warning"
                        sx={{ flexShrink: 0 }}
                      />
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selected && (
            <AppLink
              href={`/courses/${courseId}/groups/${selected.groupId}/checkpoints/${checkpointId}`}
            >
              Open full page ↗
            </AppLink>
          )}
        </Stack>
      </Stack>

      {/* Analysis content */}
      {selected ? (
        selected.analysisRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No analysis data found for this group.
          </Typography>
        ) : (
          <GroupAnalysisClient
            rows={selected.analysisRows}
            warnings={selected.repoWarnings}
            reviewWarnings={selected.reviewWarnings}
            executedPipelines={selected.executedPipelines}
          />
        )
      ) : (
        <Typography variant="body2" color="text.secondary">
          No groups found.
        </Typography>
      )}

      {/* Warnings modal */}
      {selected && (
        <WarningsModal
          groupName={selected.groupName}
          warnLogs={selected.warnLogs}
          open={warningsOpen}
          onClose={() => setWarningsOpen(false)}
        />
      )}
    </Box>
  );
}
