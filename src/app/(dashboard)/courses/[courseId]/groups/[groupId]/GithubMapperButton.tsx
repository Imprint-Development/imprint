"use client";

import { useState, useCallback } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import MuiLink from "@mui/material/Link";
import GitHubIcon from "@mui/icons-material/GitHub";
import { applyGithubUsernameMappings } from "@/lib/actions/groups";
import type {
  GitHubContributor,
  GitHubContributorsResponse,
} from "@/app/api/groups/[groupId]/github-contributors/route";

interface Props {
  groupId: string;
  courseId: string;
}

const UNASSIGNED = "__unassigned__";

export default function GithubMapperButton({ groupId, courseId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contributors, setContributors] = useState<GitHubContributor[]>([]);
  const [studentList, setStudentList] = useState<
    GitHubContributorsResponse["students"]
  >([]);
  // Map: contributor login → selected studentId (or UNASSIGNED)
  const [mappings, setMappings] = useState<Record<string, string>>({});

  const handleOpen = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    setMappings({});
    try {
      const res = await fetch(`/api/groups/${groupId}/github-contributors`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: GitHubContributorsResponse = await res.json();
      setContributors(data.contributors);
      setStudentList(data.students);

      // Pre-fill mappings from existing githubUsername assignments
      const initial: Record<string, string> = {};
      for (const contributor of data.contributors) {
        const matched = data.students.find(
          (s) =>
            s.githubUsername?.toLowerCase() === contributor.login.toLowerCase()
        );
        initial[contributor.login] = matched?.id ?? UNASSIGNED;
      }
      setMappings(initial);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const handleClose = () => {
    if (saving) return;
    setOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build studentId → githubUsername map (last-write-wins per student)
      const studentToLogin: Record<string, string> = {};

      for (const [login, studentId] of Object.entries(mappings)) {
        if (studentId === UNASSIGNED) continue;
        studentToLogin[studentId] = login;
      }

      // For students that have no contributor mapped to them, clear their username
      for (const student of studentList) {
        if (!(student.id in studentToLogin)) {
          studentToLogin[student.id] = "";
        }
      }

      await applyGithubUsernameMappings(groupId, courseId, studentToLogin);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<GitHubIcon />}
        onClick={handleOpen}
      >
        Map GitHub Users
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { variant: "outlined" } }}
      >
        <DialogTitle>Map GitHub Users to Students</DialogTitle>

        <DialogContent dividers>
          {loading && (
            <Stack
              sx={{ alignItems: "center", justifyContent: "center", py: 6 }}
            >
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Fetching contributors from GitHub…
              </Typography>
            </Stack>
          )}

          {!loading && error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && contributors.length === 0 && (
            <Alert severity="info">
              No GitHub contributors found across the group&apos;s repositories.
              Make sure the repositories are added and the GitHub token has
              access.
            </Alert>
          )}

          {!loading && !error && contributors.length > 0 && (
            <Stack spacing={0}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1.5, display: "block" }}
              >
                Assign each GitHub user who interacted on this group&apos;s
                repositories to the corresponding student. Saving will update
                all GitHub Username fields at once.
              </Typography>

              {contributors.map((c) => (
                <Box
                  key={c.login}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:last-child": { borderBottom: 0 },
                  }}
                >
                  {/* GitHub user info */}
                  <Avatar
                    src={c.avatarUrl}
                    alt={c.login}
                    sx={{ width: 32, height: 32, flexShrink: 0 }}
                  />
                  <Box sx={{ minWidth: 0, flex: "0 0 180px" }}>
                    <MuiLink
                      href={c.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="hover"
                      variant="body2"
                      sx={{ fontFamily: "monospace", fontWeight: 500 }}
                    >
                      {c.login}
                    </MuiLink>
                  </Box>

                  {/* Arrow */}
                  <Typography
                    variant="body2"
                    color="text.disabled"
                    sx={{ flexShrink: 0 }}
                  >
                    →
                  </Typography>

                  {/* Student picker */}
                  <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                    <Select
                      value={mappings[c.login] ?? UNASSIGNED}
                      onChange={(e) =>
                        setMappings((prev) => ({
                          ...prev,
                          [c.login]: e.target.value,
                        }))
                      }
                      displayEmpty
                    >
                      <MenuItem value={UNASSIGNED}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="em"
                        >
                          — not assigned —
                        </Typography>
                      </MenuItem>
                      {studentList.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: "center" }}
                          >
                            <Typography variant="body2">
                              {s.displayName}
                            </Typography>
                            {s.githubUsername && (
                              <Chip
                                label={s.githubUsername}
                                size="small"
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: "0.7rem",
                                }}
                              />
                            )}
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || loading || !!error || contributors.length === 0}
            startIcon={saving ? <CircularProgress size={14} /> : null}
          >
            {saving ? "Saving…" : "Save Mappings"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
