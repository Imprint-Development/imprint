"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormLabel from "@mui/material/FormLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Checkbox from "@mui/material/Checkbox";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import { PIPELINE_REGISTRY } from "@/lib/analysis/pipelines/registry";
import { debugRunPipeline } from "@/lib/actions/debug";

export interface DebugCourse {
  id: string;
  name: string;
  semester: string;
}

export interface DebugCheckpoint {
  id: string;
  name: string;
  courseId: string;
  status: string;
}

export interface DebugGroup {
  id: string;
  name: string;
  courseId: string;
}

interface Props {
  courses: DebugCourse[];
  checkpoints: DebugCheckpoint[];
  groups: DebugGroup[];
}

export default function DebugRunnerForm({
  courses,
  checkpoints,
  groups,
}: Props) {
  const [courseId, setCourseId] = React.useState<string>("");
  const [checkpointId, setCheckpointId] = React.useState<string>("");
  const [groupId, setGroupId] = React.useState<string>("");
  const [selectedPipelines, setSelectedPipelines] = React.useState<Set<string>>(
    new Set(PIPELINE_REGISTRY.map((p) => p.id))
  );
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<
    | { ok: true; jobId: string | undefined }
    | { ok: false; error: string }
    | null
  >(null);

  const filteredCheckpoints = checkpoints.filter(
    (cp) => !courseId || cp.courseId === courseId
  );
  const filteredGroups = groups.filter(
    (g) => !courseId || g.courseId === courseId
  );

  function togglePipeline(id: string) {
    setSelectedPipelines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setResult(null);

    const fd = new FormData();
    fd.set("checkpointId", checkpointId);
    if (groupId) fd.set("groupId", groupId);
    for (const p of selectedPipelines) fd.append("pipeline", p);

    const res = await debugRunPipeline(fd);
    setResult(res);
    setPending(false);
  }

  const selectedCheckpoint = checkpoints.find((cp) => cp.id === checkpointId);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 560 }}>
      {/* Course filter */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel id="debug-course-label">Course (filter)</InputLabel>
        <Select
          labelId="debug-course-label"
          label="Course (filter)"
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setCheckpointId("");
            setGroupId("");
          }}
          displayEmpty
        >
          <MenuItem value="">
            <em>All courses</em>
          </MenuItem>
          {courses.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name} ({c.semester})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Checkpoint */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }} required>
        <InputLabel id="debug-cp-label">Checkpoint *</InputLabel>
        <Select
          labelId="debug-cp-label"
          label="Checkpoint *"
          value={checkpointId}
          onChange={(e) => setCheckpointId(e.target.value)}
        >
          {filteredCheckpoints.length === 0 && (
            <MenuItem disabled value="">
              No checkpoints
            </MenuItem>
          )}
          {filteredCheckpoints.map((cp) => (
            <MenuItem key={cp.id} value={cp.id}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {cp.name}
                <Chip
                  label={cp.status}
                  size="small"
                  sx={{ fontSize: "0.7rem" }}
                  color={
                    cp.status === "complete"
                      ? "success"
                      : cp.status === "analyzing"
                        ? "primary"
                        : cp.status === "failed"
                          ? "error"
                          : "default"
                  }
                />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Group (optional) */}
      <FormControl fullWidth size="small" sx={{ mb: 3 }}>
        <InputLabel id="debug-group-label">Group (optional)</InputLabel>
        <Select
          labelId="debug-group-label"
          label="Group (optional)"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          displayEmpty
        >
          <MenuItem value="">
            <em>All groups</em>
          </MenuItem>
          {filteredGroups.map((g) => (
            <MenuItem key={g.id} value={g.id}>
              {g.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Pipelines */}
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend" sx={{ mb: 0.5 }}>
          Pipelines
        </FormLabel>
        <FormGroup row>
          {PIPELINE_REGISTRY.map((p) => (
            <FormControlLabel
              key={p.id}
              control={
                <Checkbox
                  size="small"
                  checked={selectedPipelines.has(p.id)}
                  onChange={() => togglePipeline(p.id)}
                />
              }
              label={p.label}
            />
          ))}
        </FormGroup>
      </FormControl>

      {/* Info about the selected checkpoint */}
      {selectedCheckpoint && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 2, display: "block" }}
        >
          Checkpoint ID: <code>{selectedCheckpoint.id}</code>
        </Typography>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={pending || !checkpointId || selectedPipelines.size === 0}
        startIcon={
          pending ? <CircularProgress size={16} color="inherit" /> : undefined
        }
      >
        {pending ? "Enqueueing…" : "Run pipeline"}
      </Button>

      {result && (
        <Alert
          severity={result.ok ? "success" : "error"}
          sx={{ mt: 2 }}
          onClose={() => setResult(null)}
        >
          {result.ok
            ? `Job enqueued successfully (ID: ${result.jobId ?? "unknown"})`
            : `Error: ${result.error}`}
        </Alert>
      )}
    </Box>
  );
}
