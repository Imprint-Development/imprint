"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Badge from "@mui/material/Badge";
import Chip from "@mui/material/Chip";
import AppLink from "@/components/AppLink";
import {
  GroupAnalysisClient,
  type AnalysisRow,
  type RepoWarning,
} from "../../groups/[groupId]/checkpoints/[checkpointId]/GroupAnalysisClient";

export interface GroupPaneData {
  groupId: string;
  groupName: string;
  studentCount: number;
  analysisRows: AnalysisRow[];
  repoWarnings: RepoWarning[];
}

interface Props {
  groups: GroupPaneData[];
  courseId: string;
  checkpointId: string;
}

export default function CheckpointGroupsPane({
  groups,
  courseId,
  checkpointId,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    groups[0]?.groupId ?? null
  );
  const selected = groups.find((g) => g.groupId === selectedId) ?? null;

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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {g.groupName}
                    {g.analysisRows.length === 0 && (
                      <Chip label="empty" size="small" color="default" />
                    )}
                    {g.repoWarnings.length > 0 && (
                      <Badge
                        badgeContent={g.repoWarnings.length}
                        color="warning"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                }
                secondary={`${g.studentCount} student${g.studentCount !== 1 ? "s" : ""}`}
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
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {selected.groupName}
              </Typography>
              <AppLink
                href={`/courses/${courseId}/groups/${selected.groupId}/checkpoints/${checkpointId}`}
              >
                Open full page ↗
              </AppLink>
            </Box>
            {selected.analysisRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No analysis data found for this group.
              </Typography>
            ) : (
              <GroupAnalysisClient
                rows={selected.analysisRows}
                warnings={selected.repoWarnings}
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
    </Box>
  );
}
