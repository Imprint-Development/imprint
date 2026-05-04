"use client";

import { useState } from "react";
import * as React from "react";
import { styled } from "@mui/material/styles";
import MuiAvatar from "@mui/material/Avatar";
import MuiListItemAvatar from "@mui/material/ListItemAvatar";
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
import Select, { selectClasses } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ListSubheader from "@mui/material/ListSubheader";
import ListItemText from "@mui/material/ListItemText";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import { GroupAnalysisClient } from "./GroupAnalysisClient";
import type {
  AnalysisRow,
  RepoWarning,
  ReviewWarning,
} from "@/lib/types/analysis";
import AiReportsSection, { type AiReportRow } from "./AiReportsSection";
import GroupAnalysisLogs from "@/components/GroupAnalysisLogs";
import { ALL_PIPELINE_IDS } from "@/lib/analysis/pipelines/registry";
import { rerunGroupAnalysis } from "@/lib/actions/checkpoints";

// ── Styled primitives from template SelectContent ────────────────────────────

const Avatar = styled(MuiAvatar)(({ theme }) => ({
  width: 28,
  height: 28,
  backgroundColor: (theme.vars || theme).palette.background.paper,
  color: (theme.vars || theme).palette.text.secondary,
  border: `1px solid ${(theme.vars || theme).palette.divider}`,
}));

const ListItemAvatar = styled(MuiListItemAvatar)({
  minWidth: 0,
  marginRight: 12,
});

// ── Types ────────────────────────────────────────────────────────────────────

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
  aiReports: AiReportRow[];
  checkpointStatus: string;
}

interface Props {
  groups: GroupPaneData[];
  courseId: string;
  checkpointId: string;
  checkpointName: string;
  checkpointStatus: string;
  initialGroupId?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortRepoLabel(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "").replace(/\.git$/, "");
  } catch {
    return url;
  }
}

// ── WarningsModal ─────────────────────────────────────────────────────────────

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

// ── GroupSelectContent — template SelectContent style ────────────────────────

function GroupSelectContent({
  groups,
  selectedId,
  onChange,
}: {
  groups: GroupPaneData[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select
      value={selectedId}
      onChange={(e) => onChange(e.target.value)}
      inputProps={{ "aria-label": "Select group" }}
      fullWidth
      sx={{
        maxHeight: 56,
        "&.MuiList-root": { p: "8px" },
        [`& .${selectClasses.select}`]: {
          display: "flex",
          alignItems: "center",
          gap: "2px",
          pl: 1,
        },
      }}
    >
      <ListSubheader sx={{ pt: 0 }}>Groups</ListSubheader>
      {groups.map((g) => (
        <MenuItem key={g.groupId} value={g.groupId}>
          <ListItemAvatar>
            <Avatar alt={g.groupName}>
              <GroupsRounded sx={{ fontSize: "1rem" }} />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                <span>{g.groupName}</span>
                {g.analysisRows.length === 0 && (
                  <Chip label="empty" size="small" color="default" />
                )}
              </Stack>
            }
            secondary={`${g.studentCount} student${g.studentCount !== 1 ? "s" : ""}`}
          />
          {g.logWarningCount > 0 && (
            <WarningAmberRounded fontSize="small" color="warning" />
          )}
        </MenuItem>
      ))}
    </Select>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const GROUP_TABS = [
  { label: "Overview", value: "overview" },
  { label: "AI Analysis", value: "ai-analysis" },
  { label: "Logs", value: "logs" },
];

export default function CheckpointGroupsPane({
  groups,
  courseId,
  checkpointId,
  checkpointName,
  checkpointStatus,
  initialGroupId,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>(
    (initialGroupId && groups.some((g) => g.groupId === initialGroupId)
      ? initialGroupId
      : groups[0]?.groupId) ?? ""
  );
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [groupTab, setGroupTab] = useState("overview");

  const selected = groups.find((g) => g.groupId === selectedId) ?? null;

  const rerunWithIds = selected
    ? rerunGroupAnalysis.bind(null, checkpointId, selected.groupId, courseId)
    : null;

  return (
    <Box>
      {/* Group selector — template SelectContent style */}
      <Stack
        direction="row"
        sx={{ alignItems: "center", mb: 3, gap: 1.5, flexWrap: "wrap" }}
      >
        <Box sx={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
          <GroupSelectContent
            groups={groups}
            selectedId={selectedId}
            onChange={(id) => {
              setSelectedId(id);
              setGroupTab("overview");
            }}
          />
        </Box>

        {/* Meta: analysedAt + pipeline chips */}
        {selected && (
          <Stack
            direction="row"
            sx={{ alignItems: "center", gap: 1, flexWrap: "wrap", flex: 1 }}
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

        {/* Actions */}
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
          {selected && rerunWithIds && checkpointStatus === "complete" && (
            <form action={rerunWithIds}>
              <Button
                type="submit"
                variant="outlined"
                color="warning"
                size="small"
              >
                Re-run for Group
              </Button>
            </form>
          )}
        </Stack>
      </Stack>

      {selected ? (
        <>
          <Tabs
            value={groupTab}
            onChange={(_, v: string) => setGroupTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
          >
            {GROUP_TABS.map((t) => (
              <Tab key={t.value} label={t.label} value={t.value} />
            ))}
          </Tabs>

          {groupTab === "overview" && (
            <>
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
          )}

          {groupTab === "ai-analysis" && (
            <AiReportsSection
              reports={selected.aiReports}
              checkpointName={checkpointName}
              groupName={selected.groupName}
              checkpointStatus={checkpointStatus}
              courseId={courseId}
              checkpointId={checkpointId}
            />
          )}

          {groupTab === "logs" && (
            <GroupAnalysisLogs
              checkpointId={checkpointId}
              groupId={selected.groupId}
              groupName={selected.groupName}
              pipelines={ALL_PIPELINE_IDS}
              initialStatus={checkpointStatus}
            />
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No groups found.
        </Typography>
      )}

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
