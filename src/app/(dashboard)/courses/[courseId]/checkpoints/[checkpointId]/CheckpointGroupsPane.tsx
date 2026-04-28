"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
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
  // Group logs by pipeline
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
  const [selectedId, setSelectedId] = useState<string | null>(
    groups[0]?.groupId ?? null
  );
  const [warningsGroupId, setWarningsGroupId] = useState<string | null>(null);
  const selected = groups.find((g) => g.groupId === selectedId) ?? null;
  const warningsGroup =
    groups.find((g) => g.groupId === warningsGroupId) ?? null;

  return (
    <Box
      sx={{
        display: "flex",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        minHeight: 480,
      }}
    >
      {/* Left: group list */}
      <Box
        sx={{
          width: 220,
          flexShrink: 0,
          borderRight: 1,
          borderColor: "divider",
          overflowY: "auto",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            px: 2,
            py: 1.5,
            display: "block",
            color: "text.secondary",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Groups
        </Typography>
        <Divider />
        <List disablePadding dense>
          {groups.map((g) => (
            <ListItemButton
              key={g.groupId}
              selected={g.groupId === selectedId}
              onClick={() => setSelectedId(g.groupId)}
              sx={{ py: 1.25 }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ flex: 1, minWidth: 0 }}
                    >
                      {g.groupName}
                    </Typography>
                    {g.analysisRows.length === 0 && (
                      <Chip label="empty" size="small" color="default" />
                    )}
                    {g.logWarningCount > 0 && (
                      <Tooltip
                        title={`${g.logWarningCount} warning${g.logWarningCount !== 1 ? "s" : ""}`}
                      >
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWarningsGroupId(g.groupId);
                          }}
                          sx={{ flexShrink: 0 }}
                        >
                          <WarningAmberRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                }
                secondary={
                  <>
                    {`${g.studentCount} student${g.studentCount !== 1 ? "s" : ""}`}
                    {g.analysedAt && (
                      <>
                        {" · "}
                        {g.analysedAt.toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </>
                    )}
                  </>
                }
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Right: analysis pane */}
      <Box sx={{ flex: 1, p: 2.5, overflowY: "auto", minWidth: 0 }}>
        {selected ? (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {selected.groupName}
                </Typography>
                {selected.logWarningCount > 0 && (
                  <Tooltip
                    title={`${selected.logWarningCount} warning${selected.logWarningCount !== 1 ? "s" : ""}`}
                  >
                    <IconButton
                      size="small"
                      color="warning"
                      onClick={() => setWarningsGroupId(selected.groupId)}
                    >
                      <WarningAmberRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              <AppLink
                href={`/courses/${courseId}/groups/${selected.groupId}/checkpoints/${checkpointId}`}
              >
                Open full page ↗
              </AppLink>
            </Box>
            {selected.analysedAt && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 2 }}
              >
                Analysed{" "}
                {selected.analysedAt.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </Typography>
            )}
            {selected.executedPipelines.length > 0 && (
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 2 }}>
                {selected.executedPipelines.map((p) => (
                  <Chip key={p} label={p} size="small" variant="outlined" />
                ))}
              </Box>
            )}
            {selected.analysisRows.length === 0 ? (
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
            )}
          </>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ pt: 6, textAlign: "center" }}
          >
            Select a group to view analysis results.
          </Typography>
        )}
      </Box>

      {/* Warnings modal */}
      {warningsGroup && (
        <WarningsModal
          groupName={warningsGroup.groupName}
          warnLogs={warningsGroup.warnLogs}
          open
          onClose={() => setWarningsGroupId(null)}
        />
      )}
    </Box>
  );
}
