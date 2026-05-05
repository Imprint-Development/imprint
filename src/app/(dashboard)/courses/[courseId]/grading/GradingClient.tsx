"use client";

import { useState, useCallback } from "react";
import { styled } from "@mui/material/styles";
import MuiAvatar from "@mui/material/Avatar";
import MuiListItemAvatar from "@mui/material/ListItemAvatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Stack from "@mui/material/Stack";
import Select, { selectClasses } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ListSubheader from "@mui/material/ListSubheader";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import EditRounded from "@mui/icons-material/EditRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import type { GradingConfig, GradeThreshold } from "@/lib/db/schema";
import { saveGrades, type GradeEntry } from "@/lib/actions/grading";

// ── Styled primitives (template SelectContent style) ──────────────────────────

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

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GradingGroup {
  id: string;
  name: string;
}

export interface GradingStudent {
  id: string;
  displayName: string;
  email: string;
  groupId: string;
}

export interface GradingCheckpoint {
  id: string;
  name: string;
}

export interface GradeValue {
  studentId: string;
  categoryId: string;
  checkpointId: string | null;
  points: number;
}

interface Props {
  courseId: string;
  config: GradingConfig;
  groups: GradingGroup[];
  students: GradingStudent[];
  checkpoints: GradingCheckpoint[];
  initialGrades: GradeValue[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcGrade(
  points: number,
  maxPoints: number,
  thresholds: GradeThreshold[]
): string {
  if (maxPoints === 0) return "—";
  const pct = (points / maxPoints) * 100;
  const sorted = [...thresholds].sort(
    (a, b) => b.minPercentage - a.minPercentage
  );
  for (const t of sorted) {
    if (pct >= t.minPercentage) return t.grade;
  }
  return "—";
}

function gradeKey(
  studentId: string,
  categoryId: string,
  checkpointId: string | null
) {
  return `${studentId}:${categoryId}:${checkpointId ?? ""}`;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function GradingClient({
  courseId,
  config,
  groups,
  students,
  checkpoints,
  initialGrades,
}: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  // local edits: key -> points string
  const [edits, setEdits] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const g of initialGrades) {
      m[gradeKey(g.studentId, g.categoryId, g.checkpointId)] = String(g.points);
    }
    return m;
  });

  const getValue = (
    studentId: string,
    categoryId: string,
    checkpointId: string | null
  ) => edits[gradeKey(studentId, categoryId, checkpointId)] ?? "";

  const setValue = useCallback(
    (
      studentId: string,
      categoryId: string,
      checkpointId: string | null,
      value: string
    ) => {
      setEdits((prev) => ({
        ...prev,
        [gradeKey(studentId, categoryId, checkpointId)]: value,
      }));
    },
    []
  );

  const standaloneCategories = config.categories.filter(
    (c) => !c.perCheckpoint
  );
  const perCpCategories = config.categories.filter((c) => c.perCheckpoint);
  const overrides = config.checkpointOverrides ?? {};
  const ungradedIds = new Set(config.ungradedCheckpoints ?? []);
  const gradedCheckpoints = checkpoints.filter((cp) => !ungradedIds.has(cp.id));

  const effMax = (catId: string, cpId: string, def: number) =>
    overrides[cpId]?.[catId]?.maxPoints ?? def;

  const maxPerStudent =
    standaloneCategories.reduce((s, c) => s + c.maxPoints, 0) +
    gradedCheckpoints.reduce(
      (cpSum, cp) =>
        cpSum +
        perCpCategories.reduce(
          (catSum, cat) => catSum + effMax(cat.id, cp.id, cat.maxPoints),
          0
        ),
      0
    );

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  const visibleStudents = (
    selectedGroupId === "all"
      ? students
      : students.filter((s) => s.groupId === selectedGroupId)
  ).toSorted((a, b) => {
    const ga = groupMap.get(a.groupId) ?? "";
    const gb = groupMap.get(b.groupId) ?? "";
    return ga.localeCompare(gb) || a.displayName.localeCompare(b.displayName);
  });

  const selectedGroup =
    selectedGroupId === "all"
      ? null
      : (groups.find((g) => g.id === selectedGroupId) ?? null);

  async function handleSave() {
    setSaving(true);
    const entries: GradeEntry[] = [];
    for (const student of visibleStudents) {
      for (const cat of standaloneCategories) {
        const raw = getValue(student.id, cat.id, null);
        const pts = parseFloat(raw);
        if (!isNaN(pts)) {
          entries.push({
            studentId: student.id,
            categoryId: cat.id,
            checkpointId: null,
            points: pts,
          });
        }
      }
      for (const cp of gradedCheckpoints) {
        for (const cat of perCpCategories) {
          const raw = getValue(student.id, cat.id, cp.id);
          const pts = parseFloat(raw);
          if (!isNaN(pts)) {
            entries.push({
              studentId: student.id,
              categoryId: cat.id,
              checkpointId: cp.id,
              points: pts,
            });
          }
        }
      }
    }
    try {
      await saveGrades(courseId, entries);
      setMode("view");
    } finally {
      setSaving(false);
    }
  }

  const perCpColSpan = perCpCategories.length;

  return (
    <Box>
      {/* Toolbar */}
      <Stack
        direction="row"
        sx={{ alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}
      >
        {/* Group filter — SelectContent style */}
        <Select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          inputProps={{ "aria-label": "Filter by group" }}
          renderValue={() =>
            selectedGroup ? (
              <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24 }}>
                  <GroupsRounded sx={{ fontSize: "0.85rem" }} />
                </Avatar>
                <span>{selectedGroup.name}</span>
              </Stack>
            ) : (
              <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24 }}>
                  <GroupsRounded sx={{ fontSize: "0.85rem" }} />
                </Avatar>
                <span>All groups</span>
              </Stack>
            )
          }
          sx={{
            maxHeight: 56,
            minWidth: 200,
            "&.MuiList-root": { p: "8px" },
            [`& .${selectClasses.select}`]: {
              display: "flex",
              alignItems: "center",
              gap: "2px",
              pl: 1,
            },
          }}
        >
          {[
            <MenuItem key="all" value="all">
              <ListItemAvatar>
                <Avatar>
                  <GroupsRounded sx={{ fontSize: "1rem" }} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary="All groups" />
            </MenuItem>,
            <ListSubheader key="__hdr" sx={{ pt: 0 }}>
              Groups
            </ListSubheader>,
            ...groups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                <ListItemAvatar>
                  <Avatar>
                    <GroupsRounded sx={{ fontSize: "1rem" }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={g.name} />
              </MenuItem>
            )),
          ]}
        </Select>

        <Box sx={{ flex: 1 }} />

        {/* View/Edit toggle */}
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => v && setMode(v)}
          size="small"
          sx={{ boxShadow: "none", borderRadius: 1 }}
        >
          <ToggleButton
            value="view"
            aria-label="view mode"
            sx={{ p: "5px 8px", borderRadius: 1 }}
          >
            <VisibilityRounded fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="edit"
            aria-label="edit mode"
            sx={{ p: "5px 8px", borderRadius: 1 }}
          >
            <EditRounded fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        {mode === "edit" && (
          <Button
            variant="contained"
            startIcon={<SaveRounded />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </Stack>

      {/* Table */}
      <TableContainer
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "auto",
        }}
      >
        <Table size="small" sx={{ minWidth: 600 }}>
          <TableHead>
            {/* Row 1: category group headers */}
            <TableRow>
              <TableCell rowSpan={2} sx={{ fontWeight: 700 }}>
                Student
              </TableCell>
              <TableCell rowSpan={2} sx={{ fontWeight: 700 }}>
                Group
              </TableCell>
              {standaloneCategories.map((cat) => (
                <TableCell key={cat.id} rowSpan={2} sx={{ fontWeight: 700 }}>
                  {cat.name}
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ display: "block", color: "text.secondary" }}
                  >
                    /{cat.maxPoints} pts
                  </Typography>
                </TableCell>
              ))}
              {perCpColSpan > 0 &&
                gradedCheckpoints.map((cp) => (
                  <TableCell
                    key={cp.id}
                    colSpan={perCpColSpan}
                    sx={{
                      fontWeight: 700,
                      borderLeft: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {cp.name}
                  </TableCell>
                ))}
              <TableCell
                rowSpan={2}
                sx={{
                  fontWeight: 700,
                  borderLeft: perCpColSpan > 0 ? "1px solid" : undefined,
                  borderColor: "divider",
                }}
              >
                Total
              </TableCell>
              {config.gradeThresholds.length > 0 && (
                <TableCell
                  rowSpan={2}
                  sx={{
                    fontWeight: 700,
                    borderLeft: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  Grade
                </TableCell>
              )}
            </TableRow>
            {/* Row 2: per-checkpoint category names */}
            {perCpColSpan > 0 && (
              <TableRow>
                {gradedCheckpoints.map((cp) =>
                  perCpCategories.map((cat) => {
                    const max = effMax(cat.id, cp.id, cat.maxPoints);
                    const isOverridden =
                      overrides[cp.id]?.[cat.id] !== undefined;
                    return (
                      <TableCell
                        key={`${cp.id}:${cat.id}`}
                        sx={{
                          borderLeft:
                            cat === perCpCategories[0]
                              ? "1px solid"
                              : undefined,
                          borderColor: "divider",
                        }}
                      >
                        {cat.name}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            display: "block",
                            color: isOverridden
                              ? "warning.main"
                              : "text.secondary",
                            fontWeight: isOverridden ? 600 : undefined,
                          }}
                        >
                          /{max}
                          {isOverridden && " *"}
                        </Typography>
                      </TableCell>
                    );
                  })
                )}
              </TableRow>
            )}
          </TableHead>
          <TableBody>
            {visibleStudents.map((student) => {
              let totalPoints = 0;

              const standaloneCells = standaloneCategories.map((cat) => {
                const val = getValue(student.id, cat.id, null);
                const pts = parseFloat(val);
                if (!isNaN(pts)) totalPoints += pts;
                return (
                  <TableCell key={cat.id}>
                    {mode === "edit" ? (
                      <TextField
                        size="small"
                        type="number"
                        value={val}
                        onChange={(e) =>
                          setValue(student.id, cat.id, null, e.target.value)
                        }
                        slotProps={{
                          htmlInput: { step: 0.5, min: 0, max: cat.maxPoints },
                        }}
                        placeholder={`/${cat.maxPoints}`}
                        sx={{ width: 72 }}
                      />
                    ) : (
                      <Typography variant="body2">
                        {val !== "" ? val : "—"}
                      </Typography>
                    )}
                  </TableCell>
                );
              });

              const perCpCells = gradedCheckpoints.flatMap((cp) =>
                perCpCategories.map((cat, catIdx) => {
                  const max = effMax(cat.id, cp.id, cat.maxPoints);
                  const val = getValue(student.id, cat.id, cp.id);
                  const pts = parseFloat(val);
                  if (!isNaN(pts)) totalPoints += pts;
                  return (
                    <TableCell
                      key={`${cp.id}:${cat.id}`}
                      sx={{
                        borderLeft: catIdx === 0 ? "1px solid" : undefined,
                        borderColor: "divider",
                      }}
                    >
                      {mode === "edit" ? (
                        <TextField
                          size="small"
                          type="number"
                          value={val}
                          onChange={(e) =>
                            setValue(student.id, cat.id, cp.id, e.target.value)
                          }
                          slotProps={{
                            htmlInput: { step: 0.5, min: 0, max },
                          }}
                          placeholder={`/${max}`}
                          sx={{ width: 72 }}
                        />
                      ) : (
                        <Typography variant="body2">
                          {val !== "" ? val : "—"}
                        </Typography>
                      )}
                    </TableCell>
                  );
                })
              );

              const pct =
                maxPerStudent > 0
                  ? ((totalPoints / maxPerStudent) * 100).toFixed(1)
                  : null;

              return (
                <TableRow key={student.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {student.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {student.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={groupMap.get(student.groupId) ?? "—"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  {standaloneCells}
                  {perCpCells}
                  <TableCell
                    sx={{
                      borderLeft: perCpColSpan > 0 ? "1px solid" : undefined,
                      borderColor: "divider",
                    }}
                  >
                    {pct !== null ? (
                      <Typography variant="body2">
                        {totalPoints}/{maxPerStudent}{" "}
                        <Typography component="span" variant="caption">
                          ({pct}%)
                        </Typography>
                      </Typography>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  {config.gradeThresholds.length > 0 && (
                    <TableCell
                      sx={{ borderLeft: "1px solid", borderColor: "divider" }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {calcGrade(
                          totalPoints,
                          maxPerStudent,
                          config.gradeThresholds
                        )}
                      </Typography>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
