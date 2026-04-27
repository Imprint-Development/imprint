import AppLink from "@/components/AppLink";
import ButtonLink from "@/components/ButtonLink";
import ImportCsvButton from "@/components/ImportCsvButton";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import TabNav from "@/components/TabNav";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  courses,
  courseCollaborators,
  studentGroups,
  students,
  users,
  checkpoints,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  addCollaborator,
  removeCollaborator,
  updateCourse,
  deleteCourse,
  addIgnoredGitEmail,
  removeIgnoredGitEmail,
} from "@/lib/actions/courses";
import { CHECKPOINT_STATUS_COLOR } from "@/lib/constants";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableContainer from "@mui/material/TableContainer";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Paper from "@mui/material/Paper";
import HomeRounded from "@mui/icons-material/HomeRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import AddRounded from "@mui/icons-material/AddRounded";

const TABS = [
  { label: "Groups", value: "groups" },
  { label: "Checkpoints", value: "checkpoints" },
  { label: "Collaborators", value: "collaborators" },
  { label: "Settings", value: "settings" },
];

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { courseId } = await params;
  const { tab = "groups" } = await searchParams;

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

  // Data for Groups tab
  const groups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, courseId));

  const groupsWithCounts = await Promise.all(
    groups.map(async (group) => {
      const studentList = await db
        .select()
        .from(students)
        .where(eq(students.groupId, group.id));
      return { ...group, studentCount: studentList.length };
    })
  );

  // Data for Checkpoints tab
  const courseCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.courseId, courseId))
    .orderBy(checkpoints.createdAt);

  // Data for Collaborators tab
  const collaborators = await db
    .select({
      id: courseCollaborators.id,
      role: courseCollaborators.role,
      email: users.email,
    })
    .from(courseCollaborators)
    .innerJoin(users, eq(users.id, courseCollaborators.userId))
    .where(eq(courseCollaborators.courseId, courseId));

  const addCollaboratorWithId = addCollaborator.bind(null, courseId);
  const updateCourseWithId = updateCourse.bind(null, courseId);
  const deleteCourseWithId = deleteCourse.bind(null, courseId);
  const addIgnoredEmailWithId = addIgnoredGitEmail.bind(null, courseId);

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          <HomeRounded fontSize="small" />
        </AppLink>
        <AppLink href="/courses">Courses</AppLink>
        <Typography>{course.name}</Typography>
      </Breadcrumbs>

      <Stack direction="row" sx={{ alignItems: "center", mb: 3 }} spacing={2}>
        <Typography variant="h5">{course.name}</Typography>
        <Chip
          size="small"
          label={course.semester}
          color="primary"
          variant="outlined"
        />
      </Stack>

      <TabNav tabs={TABS} defaultTab="groups" />

      {/* Groups tab */}
      {tab === "groups" && (
        <Box>
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Student Groups</Typography>
            <Stack direction="row" spacing={1}>
              <ImportCsvButton courseId={courseId} />
              <ButtonLink
                href={`/courses/${courseId}/groups/new`}
                size="small"
                startIcon={<AddRounded />}
              >
                Add Group
              </ButtonLink>
            </Stack>
          </Stack>
          {groupsWithCounts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No groups yet.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Students</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupsWithCounts.map((group) => (
                    <TableRow
                      key={group.id}
                      hover
                      sx={{ position: "relative" }}
                    >
                      <TableCell>
                        <AppLink
                          href={`/courses/${courseId}/groups/${group.id}`}
                          sx={{
                            "&::after": {
                              content: '""',
                              position: "absolute",
                              inset: 0,
                            },
                          }}
                        >
                          {group.name}
                        </AppLink>
                      </TableCell>
                      <TableCell>{group.studentCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Checkpoints tab */}
      {tab === "checkpoints" && (
        <Box>
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Checkpoints</Typography>
            <ButtonLink
              href={`/courses/${courseId}/checkpoints/new`}
              size="small"
              startIcon={<AddRounded />}
            >
              Create Checkpoint
            </ButtonLink>
          </Stack>
          {courseCheckpoints.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No checkpoints yet.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Git Ref</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {courseCheckpoints.map((cp) => (
                    <TableRow key={cp.id} hover sx={{ position: "relative" }}>
                      <TableCell>
                        <AppLink
                          href={`/courses/${courseId}/checkpoints/${cp.id}`}
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
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {cp.gitRef ?? "—"}
                        </Typography>
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
                      <TableCell>
                        {cp.startDate
                          ? new Date(cp.startDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {cp.endDate
                          ? new Date(cp.endDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Collaborators tab */}
      {tab === "collaborators" && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Collaborators
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {collaborators.map((collab) => (
                  <TableRow key={collab.id}>
                    <TableCell>{collab.email}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={collab.role}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <form
                        action={removeCollaborator.bind(
                          null,
                          collab.id,
                          courseId
                        )}
                      >
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
          <Divider sx={{ my: 2 }} />
          <form action={addCollaboratorWithId}>
            <Stack direction="row" spacing={1}>
              <TextField
                name="email"
                placeholder="Email address"
                type="email"
                size="small"
                sx={{ flex: 1, maxWidth: 400 }}
              />
              <Button type="submit" size="small" variant="contained">
                Add
              </Button>
            </Stack>
          </form>
        </Box>
      )}

      {/* Settings tab */}
      {tab === "settings" && (
        <Box sx={{ maxWidth: 600 }}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Course Details
              </Typography>
              <form action={updateCourseWithId}>
                <Stack spacing={2}>
                  <FormControl required>
                    <FormLabel>Course Name</FormLabel>
                    <TextField
                      name="name"
                      defaultValue={course.name}
                      size="small"
                      fullWidth
                    />
                  </FormControl>
                  <FormControl required>
                    <FormLabel>Semester</FormLabel>
                    <TextField
                      name="semester"
                      defaultValue={course.semester}
                      size="small"
                      fullWidth
                    />
                  </FormControl>
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Save Changes
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Ignored Git Emails
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Commits from these git identities will not appear as
                unidentified author warnings.
              </Typography>
              {course.ignoredGitEmails.length > 0 && (
                <Stack direction="row" sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
                  {course.ignoredGitEmails.map((email) => (
                    <form
                      key={email}
                      action={removeIgnoredGitEmail.bind(null, courseId, email)}
                    >
                      <Chip
                        size="small"
                        label={email}
                        onDelete={undefined}
                        deleteIcon={
                          <IconButton
                            type="submit"
                            size="small"
                            sx={{ borderRadius: "50%", p: 0 }}
                          >
                            <DeleteRounded fontSize="small" />
                          </IconButton>
                        }
                        variant="outlined"
                      />
                    </form>
                  ))}
                </Stack>
              )}
              <Divider sx={{ my: 2 }} />
              <form action={addIgnoredEmailWithId}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    name="ignoredEmail"
                    placeholder="git-email@example.com"
                    type="email"
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <Button type="submit" size="small" variant="outlined">
                    Add
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
                Deleting a course is permanent and cannot be undone.
              </Typography>
              <ConfirmDeleteButton
                title="Delete Course"
                description={`Are you sure you want to delete "${course.name}"? This action cannot be undone.`}
                action={deleteCourseWithId}
                buttonLabel="Delete Course"
              />
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
