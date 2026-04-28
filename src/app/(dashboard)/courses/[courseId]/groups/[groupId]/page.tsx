import AppLink from "@/components/AppLink";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import TabNav from "@/components/TabNav";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  courses,
  courseCollaborators,
  studentGroups,
  students,
  repositories,
  checkpoints,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  addStudent,
  removeStudent,
  addRepository,
  removeRepository,
  deleteGroup,
  renameGroup,
  addStudentGitEmail,
  removeStudentGitEmail,
  setStudentGithubUsername,
} from "@/lib/actions/groups";
import { CHECKPOINT_STATUS_COLOR } from "@/lib/constants";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import MuiLink from "@mui/material/Link";
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
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ErrorRounded from "@mui/icons-material/ErrorRounded";
import MembersTab from "./MembersTab";

function HealthCheck({
  pass,
  label,
  hint,
}: {
  pass: boolean;
  label: string;
  hint: string;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      {pass ? (
        <CheckCircleRounded color="success" fontSize="small" />
      ) : (
        <ErrorRounded color="error" fontSize="small" />
      )}
      <Box>
        <Typography variant="body2" sx={{ fontWeight: pass ? 400 : 600 }}>
          {label}
        </Typography>
        {!pass && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

const TABS = [
  { label: "Overview", value: "overview" },
  { label: "Members", value: "members" },
  { label: "Repositories", value: "repositories" },
  { label: "Checkpoints", value: "checkpoints" },
  { label: "Settings", value: "settings" },
];

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; groupId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { courseId, groupId } = await params;
  const { tab = "overview" } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [membership] = await db
    .select()
    .from(courseCollaborators)
    .where(
      and(
        eq(courseCollaborators.courseId, courseId),
        eq(courseCollaborators.userId, session.user.id)
      )
    );
  if (!membership) redirect("/courses");

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId));
  if (!course) redirect("/courses");

  const [group] = await db
    .select()
    .from(studentGroups)
    .where(
      and(eq(studentGroups.id, groupId), eq(studentGroups.courseId, courseId))
    );
  if (!group) redirect(`/courses/${courseId}`);

  const studentList = await db
    .select()
    .from(students)
    .where(eq(students.groupId, groupId));

  const repoList = await db
    .select()
    .from(repositories)
    .where(eq(repositories.groupId, groupId));

  const courseCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.courseId, courseId))
    .orderBy(checkpoints.createdAt);

  const addStudentWithIds = addStudent.bind(null, groupId, courseId);
  const addRepoWithIds = addRepository.bind(null, groupId, courseId);
  const deleteGroupWithIds = deleteGroup.bind(null, groupId, courseId);
  const renameGroupWithIds = renameGroup.bind(null, groupId, courseId);

  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs
        items={[
          { label: "Groups", href: `/courses/${courseId}/groups` },
          { label: group.name },
        ]}
      />

      <Typography variant="h5" sx={{ mb: 3 }}>
        {group.name}
      </Typography>

      <TabNav tabs={TABS} defaultTab="overview" />

      {/* Overview tab */}
      {tab === "overview" && (
        <Box>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Group Info
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>Course:</strong> {course.name} ({course.semester})
                </Typography>
                <Typography variant="body2">
                  <strong>Members:</strong> {studentList.length}
                </Typography>
                <Typography variant="body2">
                  <strong>Repositories:</strong> {repoList.length}
                </Typography>
                <Typography variant="body2">
                  <strong>Checkpoints:</strong> {courseCheckpoints.length}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Health Checks
              </Typography>
              <Stack spacing={1.5}>
                <HealthCheck
                  pass={studentList.length > 0}
                  label="At least one member defined"
                  hint="Add students in the Members tab"
                />
                <HealthCheck
                  pass={repoList.length > 0}
                  label="At least one repository added"
                  hint="Add a repository in the Repositories tab"
                />
                <HealthCheck
                  pass={courseCheckpoints.some(
                    (cp) => cp.status === "complete"
                  )}
                  label="At least one checkpoint analysis completed"
                  hint="Run an analysis from the Checkpoints page"
                />
                <HealthCheck
                  pass={
                    studentList.length > 0 &&
                    studentList.every((s) => s.githubUsername)
                  }
                  label="All members have a GitHub username"
                  hint="Set GitHub usernames in the Members tab or use the mapper"
                />
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Members tab */}
      {tab === "members" && (
        <MembersTab
          groupId={groupId}
          courseId={courseId}
          students={studentList}
          addStudentAction={addStudentWithIds}
          removeStudentAction={removeStudent}
          setGithubUsernameAction={setStudentGithubUsername}
          addGitEmailAction={addStudentGitEmail}
          removeGitEmailAction={removeStudentGitEmail}
        />
      )}

      {/* Repositories tab */}
      {tab === "repositories" && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Repositories
          </Typography>
          {repoList.length > 0 && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {repoList.map((repo) => (
                <Stack
                  key={repo.id}
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <MuiLink
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {repo.url}
                  </MuiLink>
                  <form action={removeRepository.bind(null, repo.id, courseId)}>
                    <IconButton type="submit" size="small" color="error">
                      <DeleteRounded />
                    </IconButton>
                  </form>
                </Stack>
              ))}
            </Stack>
          )}
          <Divider sx={{ my: 2 }} />
          <form action={addRepoWithIds}>
            <Stack direction="row" spacing={1}>
              <TextField
                name="url"
                placeholder="Repository URL"
                type="url"
                size="small"
                sx={{ flex: 1, maxWidth: 500 }}
              />
              <Button type="submit" size="small" variant="contained">
                Add Repository
              </Button>
            </Stack>
          </form>
        </Box>
      )}

      {/* Checkpoints tab */}
      {tab === "checkpoints" && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Checkpoint Analyses
          </Typography>
          {courseCheckpoints.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No checkpoints yet.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Checkpoint</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {courseCheckpoints.map((cp) => (
                    <TableRow key={cp.id} hover sx={{ position: "relative" }}>
                      <TableCell>
                        <AppLink
                          href={`/courses/${courseId}/groups/${groupId}/checkpoints/${cp.id}`}
                          sx={{
                            "&::after": {
                              content: '""',
                              position: "absolute",
                              inset: 0,
                            },
                          }}
                        >
                          {cp.name}
                        </AppLink>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={
                            CHECKPOINT_STATUS_COLOR[
                              cp.status as keyof typeof CHECKPOINT_STATUS_COLOR
                            ] ?? "default"
                          }
                          label={cp.status}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Settings tab */}
      {tab === "settings" && (
        <Box sx={{ maxWidth: 600 }}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Rename Group
              </Typography>
              <form action={renameGroupWithIds}>
                <Stack direction="row" spacing={1}>
                  <FormControl required sx={{ flex: 1 }}>
                    <FormLabel>Group Name</FormLabel>
                    <TextField
                      name="name"
                      defaultValue={group.name}
                      size="small"
                      fullWidth
                    />
                  </FormControl>
                  <Button
                    type="submit"
                    size="small"
                    variant="contained"
                    sx={{ mt: "auto" }}
                  >
                    Rename
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderColor: "error.main" }}>
            <CardContent>
              <Typography variant="h6" color="error" sx={{ mb: 1 }}>
                Danger Zone
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Deleting this group will remove all students and repositories.
              </Typography>
              <ConfirmDeleteButton
                title="Delete Group"
                description={`Are you sure you want to delete "${group.name}"? This will permanently remove all ${studentList.length} student${studentList.length !== 1 ? "s" : ""} and ${repoList.length} repositor${repoList.length !== 1 ? "ies" : "y"} in this group. This action cannot be undone.`}
                action={deleteGroupWithIds}
                buttonLabel="Delete Group"
              />
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
