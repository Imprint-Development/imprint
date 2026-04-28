"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import MuiLink from "@mui/material/Link";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import GithubMapperButton from "./GithubMapperButton";

interface Student {
  id: string;
  displayName: string;
  email: string;
  githubUsername: string | null;
  gitEmails: string[];
}

interface Props {
  groupId: string;
  courseId: string;
  students: Student[];
  // Server actions (already bound with groupId/courseId/studentId where needed)
  addStudentAction: (formData: FormData) => Promise<void>;
  removeStudentAction: (studentId: string, courseId: string) => Promise<void>;
  setGithubUsernameAction: (
    studentId: string,
    courseId: string,
    formData: FormData
  ) => Promise<void>;
  addGitEmailAction: (
    studentId: string,
    courseId: string,
    formData: FormData
  ) => Promise<void>;
  removeGitEmailAction: (
    studentId: string,
    courseId: string,
    gitEmail: string
  ) => Promise<void>;
}

export default function MembersTab({
  groupId,
  courseId,
  students,
  addStudentAction,
  removeStudentAction,
  setGithubUsernameAction,
  addGitEmailAction,
  removeGitEmailAction,
}: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const isEdit = mode === "edit";

  return (
    <Box>
      {/* Header row */}
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
      >
        <Typography variant="h6">Students</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <GithubMapperButton groupId={groupId} courseId={courseId} />
          <ToggleButtonGroup
            value={mode}
            exclusive
            size="small"
            onChange={(_, v) => v && setMode(v)}
            aria-label="table mode"
          >
            <ToggleButton value="view" aria-label="view mode">
              <VisibilityRounded fontSize="small" />
            </ToggleButton>
            <ToggleButton value="edit" aria-label="edit mode">
              <EditRounded fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {students.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Display Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>GitHub Username</TableCell>
                {isEdit && <TableCell>Git Email Aliases</TableCell>}
                {isEdit && <TableCell sx={{ width: 60 }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.displayName}</TableCell>
                  <TableCell>{student.email}</TableCell>

                  {/* GitHub Username */}
                  <TableCell>
                    {isEdit ? (
                      <form
                        action={setGithubUsernameAction.bind(
                          null,
                          student.id,
                          courseId
                        )}
                      >
                        <Stack direction="row" spacing={0.5}>
                          <TextField
                            name="githubUsername"
                            placeholder="github-login"
                            defaultValue={student.githubUsername ?? ""}
                            size="small"
                            sx={{ width: 160 }}
                            slotProps={{
                              input: {
                                sx: {
                                  fontFamily: "monospace",
                                  fontSize: "0.85rem",
                                },
                              },
                            }}
                          />
                          <Button type="submit" size="small" variant="outlined">
                            Save
                          </Button>
                        </Stack>
                      </form>
                    ) : student.githubUsername ? (
                      <MuiLink
                        href={`https://github.com/${student.githubUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {student.githubUsername}
                      </MuiLink>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>

                  {/* Git Email Aliases (edit mode only) */}
                  {isEdit && (
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Stack
                          direction="row"
                          sx={{ flexWrap: "wrap", gap: 0.5 }}
                        >
                          {student.gitEmails.map((alias) => (
                            <form
                              key={alias}
                              action={removeGitEmailAction.bind(
                                null,
                                student.id,
                                courseId,
                                alias
                              )}
                            >
                              <Chip
                                size="small"
                                label={alias}
                                onDelete={undefined}
                                deleteIcon={
                                  <IconButton
                                    type="submit"
                                    size="small"
                                    sx={{ borderRadius: "50%", p: 0 }}
                                  >
                                    ×
                                  </IconButton>
                                }
                                variant="outlined"
                              />
                            </form>
                          ))}
                        </Stack>
                        <form
                          action={addGitEmailAction.bind(
                            null,
                            student.id,
                            courseId
                          )}
                        >
                          <Stack direction="row" spacing={0.5}>
                            <TextField
                              name="gitEmail"
                              placeholder="Add git email"
                              size="small"
                              type="email"
                              sx={{ flex: 1, minWidth: 180 }}
                            />
                            <Button
                              type="submit"
                              size="small"
                              variant="outlined"
                            >
                              Add
                            </Button>
                          </Stack>
                        </form>
                      </Stack>
                    </TableCell>
                  )}

                  {/* Delete (edit mode only) */}
                  {isEdit && (
                    <TableCell>
                      <form
                        action={removeStudentAction.bind(
                          null,
                          student.id,
                          courseId
                        )}
                      >
                        <IconButton type="submit" size="small" color="error">
                          <DeleteRounded />
                        </IconButton>
                      </form>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add student form (edit mode only) */}
      {isEdit && (
        <>
          <Divider sx={{ my: 2 }} />
          <form action={addStudentAction}>
            <Stack direction="row" spacing={1}>
              <TextField
                name="displayName"
                placeholder="Display name"
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                name="email"
                placeholder="Email"
                type="email"
                size="small"
                sx={{ flex: 1 }}
              />
              <Button type="submit" size="small" variant="contained">
                Add Student
              </Button>
            </Stack>
          </form>
        </>
      )}
    </Box>
  );
}
