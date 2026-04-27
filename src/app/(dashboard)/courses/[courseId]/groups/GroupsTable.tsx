"use client";

import { useState, Fragment } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRounded from "@mui/icons-material/KeyboardArrowUpRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import Tooltip from "@mui/material/Tooltip";
import AppLink from "@/components/AppLink";

export interface GroupRowData {
  id: string;
  name: string;
  students: { id: string; displayName: string; email: string }[];
  repos: { id: string; url: string }[];
}

function CollapsibleRow({
  group,
  courseId,
}: {
  group: GroupRowData;
  courseId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Fragment>
      <TableRow
        hover
        sx={{ "& > *": { borderBottom: open ? "unset" : undefined } }}
      >
        <TableCell sx={{ width: 40, pr: 0 }}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? (
              <KeyboardArrowUpRounded fontSize="small" />
            ) : (
              <KeyboardArrowDownRounded fontSize="small" />
            )}
          </IconButton>
        </TableCell>
        <TableCell>
          <AppLink href={`/courses/${courseId}/groups/${group.id}`}>
            {group.name}
          </AppLink>
        </TableCell>
        <TableCell align="right">{group.students.length}</TableCell>
        <TableCell align="right">{group.repos.length}</TableCell>
        <TableCell align="center">
          {group.repos.length === 0 ? (
            <Tooltip title="No repositories added">
              <WarningAmberRounded color="warning" fontSize="small" />
            </Tooltip>
          ) : group.students.length === 0 ? (
            <Tooltip title="No members defined">
              <WarningAmberRounded color="warning" fontSize="small" />
            </Tooltip>
          ) : (
            <Tooltip title="Ready">
              <CheckCircleRounded color="success" fontSize="small" />
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell sx={{ py: 0 }} colSpan={5}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, pl: 5 }}>
              {/* Members */}
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                Members
              </Typography>
              {group.students.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No members yet.
                </Typography>
              ) : (
                <Stack
                  direction="row"
                  sx={{ flexWrap: "wrap", gap: 0.75, mb: 2 }}
                >
                  {group.students.map((s) => (
                    <Chip
                      key={s.id}
                      label={`${s.displayName} (${s.email})`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              )}

              {/* Repositories */}
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                Repositories
              </Typography>
              {group.repos.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No repositories yet.
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {group.repos.map((r) => (
                    <MuiLink
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                    >
                      {r.url}
                    </MuiLink>
                  ))}
                </Stack>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </Fragment>
  );
}

export default function GroupsTable({
  groups,
  courseId,
}: {
  groups: GroupRowData[];
  courseId: string;
}) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }} />
            <TableCell>Name</TableCell>
            <TableCell align="right">Members</TableCell>
            <TableCell align="right">Repositories</TableCell>
            <TableCell align="center">Health</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map((group) => (
            <CollapsibleRow key={group.id} group={group} courseId={courseId} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
