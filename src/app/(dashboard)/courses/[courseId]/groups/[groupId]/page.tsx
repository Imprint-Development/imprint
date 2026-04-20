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
} from "@/lib/actions/groups";
import { CHECKPOINT_STATUS_COLOR } from "@/lib/constants";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Breadcrumbs from "@mui/material/Breadcrumbs";
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
import HomeRounded from "@mui/icons-material/HomeRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";

const TABS = [
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
  const { tab = "members" } = await searchParams;

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
    .where(and(eq(studentGroups.id, groupId), eq(studentGroups.courseId, courseId)));
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
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          <HomeRounded fontSize="small" />
        </AppLink>
        <AppLink href="/courses">Courses</AppLink>
        <AppLink href={`/courses/${courseId}`}>{course.name}</AppLink>
        <Typography>{group.name}</Typography>
      </Breadcrumbs>

      <Typography variant="h5" sx={{ mb: 3 }}>
        {group.name}
      </Typography>

      <TabNav tabs={TABS} defaultTab="members" />

      {/* Members tab */}
      {tab === "members" && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Students
          </Typography>
          {studentList.length > 0 && (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Display Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Git Email Aliases</TableCell>
                    <TableCell sx={{ width: 60 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentList.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.displayName}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                            {student.gitEmails.map((alias) => (
                              <form
                                key={alias}
                                action={removeStudentGitEmail.bind(null, student.id, courseId, alias)}
                              >
                                <Chip
                                  size="small"
                                  label={alias}
                                  onDelete={undefined}
                                  deleteIcon={
                                    <IconButton type="submit" size="small" sx={{ borderRadius: "50%", p: 0 }}>
                                      ×
                                    </IconButton>
                                  }
                                  variant="outlined"
                                />
                              </form>
                            ))}
                          </Stack>
                          <form action={addStudentGitEmail.bind(null, student.id, courseId)}>
                            <Stack direction="row" spacing={0.5}>
                              <TextField
                                name="gitEmail"
                                placeholder="Add git email"
                                size="small"
                                type="email"
                                sx={{ flex: 1, minWidth: 180 }}
                              />
                              <Button type="submit" size="small" variant="outlined">
                                Add
                              </Button>
                            </Stack>
                          </form>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <form action={removeStudent.bind(null, student.id, courseId)}>
                          <IconButton type="submit" size="small" color="error">
                            <DeleteRounded />
                          </IconButton>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Divider sx={{ my: 2 }} />
          <form action={addStudentWithIds}>
            <Stack direction="row" spacing={1}>
              <TextField name="displayName" placeholder="Display name" size="small" sx={{ flex: 1 }} />
              <TextField name="email" placeholder="Email" type="email" size="small" sx={{ flex: 1 }} />
              <Button type="submit" size="small" variant="contained">
                Add Student
              </Button>
            </Stack>
          </form>
        </Box>
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
                  <MuiLink href={repo.url} target="_blank" rel="noopener noreferrer">
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
                          color={CHECKPOINT_STATUS_COLOR[cp.status as keyof typeof CHECKPOINT_STATUS_COLOR] ?? "default"}
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
                    <TextField name="name" defaultValue={group.name} size="small" fullWidth />
                  </FormControl>
                  <Button type="submit" size="small" variant="contained" sx={{ mt: "auto" }}>
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
