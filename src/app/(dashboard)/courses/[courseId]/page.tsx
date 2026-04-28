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
import type { GradingConfig } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  addCollaborator,
  removeCollaborator,
  updateCourse,
  deleteCourse,
  addIgnoredGitEmail,
  removeIgnoredGitEmail,
  addIgnoredGithubUsername,
  removeIgnoredGithubUsername,
  addGradingCategory,
  removeGradingCategory,
  addGradeThreshold,
  removeGradeThreshold,
  setCheckpointCategoryMaxPoints,
} from "@/lib/actions/courses";
import { CHECKPOINT_STATUS_COLOR } from "@/lib/constants";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
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
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import Save from "@mui/icons-material/Save";

const TABS = [
  { label: "Groups", value: "groups" },
  { label: "Checkpoints", value: "checkpoints" },
  { label: "Grading", value: "grading" },
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

  const config: GradingConfig = course.gradingConfig;
  const perCheckpointCategories = config.categories.filter((c) => c.perCheckpoint);

  const addCollaboratorWithId = addCollaborator.bind(null, courseId);
  const updateCourseWithId = updateCourse.bind(null, courseId);
  const deleteCourseWithId = deleteCourse.bind(null, courseId);
  const addIgnoredEmailWithId = addIgnoredGitEmail.bind(null, courseId);
  const addIgnoredGithubUsernameWithId = addIgnoredGithubUsername.bind(
    null,
    courseId
  );
  const addGradingCategoryWithId = addGradingCategory.bind(null, courseId);
  const addGradeThresholdWithId = addGradeThreshold.bind(null, courseId);

  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs
        items={[
          { label: "Course management", href: "/courses" },
          { label: course.name },
        ]}
      />

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

      {/* Grading tab */}
      {tab === "grading" && (
        <Box sx={{ maxWidth: 700 }}>
          {/* Grading Categories */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Grading Categories
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Define point categories. Standalone categories apply once per
                student; per-checkpoint categories are graded for each
                checkpoint separately.
              </Typography>

              {config.categories.length > 0 && (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Max Points</TableCell>
                        <TableCell>Scope</TableCell>
                        <TableCell sx={{ width: 48 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {config.categories.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell>{cat.name}</TableCell>
                          <TableCell>{cat.maxPoints}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={cat.perCheckpoint ? "Per checkpoint" : "Standalone"}
                              variant="outlined"
                              color={cat.perCheckpoint ? "primary" : "default"}
                            />
                          </TableCell>
                          <TableCell>
                            <form
                              action={removeGradingCategory.bind(
                                null,
                                courseId,
                                cat.id
                              )}
                            >
                              <IconButton
                                type="submit"
                                size="small"
                                color="error"
                              >
                                <DeleteRounded fontSize="small" />
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

              <form action={addGradingCategoryWithId}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
                    <FormControl sx={{ flex: 1 }}>
                      <FormLabel>Category Name</FormLabel>
                      <TextField
                        name="name"
                        placeholder="e.g. Code Quality"
                        size="small"
                        required
                      />
                    </FormControl>
                    <FormControl sx={{ width: 120 }}>
                      <FormLabel>Max Points</FormLabel>
                      <TextField
                        name="maxPoints"
                        type="number"
                        size="small"
                        required
                        slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                      />
                    </FormControl>
                    <FormControl sx={{ width: 160 }}>
                      <FormLabel>Scope</FormLabel>
                      <Select
                        name="perCheckpoint"
                        size="small"
                        defaultValue="false"
                      >
                        <MenuItem value="false">Standalone</MenuItem>
                        <MenuItem value="true">Per checkpoint</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      type="submit"
                      size="small"
                      variant="outlined"
                      startIcon={<AddRounded />}
                      sx={{ mb: 0.25 }}
                    >
                      Add
                    </Button>
                  </Stack>
                </Stack>
              </form>
            </CardContent>
          </Card>

          {/* Grade Thresholds */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Grade Thresholds
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Map percentage ranges to letter grades or labels. The highest
                matching threshold is applied.
              </Typography>

              {config.gradeThresholds.length > 0 && (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Grade</TableCell>
                        <TableCell>Minimum %</TableCell>
                        <TableCell sx={{ width: 48 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...config.gradeThresholds]
                        .sort((a, b) => b.minPercentage - a.minPercentage)
                        .map((t) => (
                          <TableRow key={t.grade}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {t.grade}
                              </Typography>
                            </TableCell>
                            <TableCell>{t.minPercentage}%</TableCell>
                            <TableCell>
                              <form
                                action={removeGradeThreshold.bind(
                                  null,
                                  courseId,
                                  t.grade
                                )}
                              >
                                <IconButton
                                  type="submit"
                                  size="small"
                                  color="error"
                                >
                                  <DeleteRounded fontSize="small" />
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

              <form action={addGradeThresholdWithId}>
                <Stack direction="row" spacing={1} alignItems="flex-end">
                  <FormControl sx={{ width: 120 }}>
                    <FormLabel>Grade</FormLabel>
                    <TextField
                      name="grade"
                      placeholder="e.g. A"
                      size="small"
                      required
                    />
                  </FormControl>
                  <FormControl sx={{ width: 140 }}>
                    <FormLabel>Min % (≥)</FormLabel>
                    <TextField
                      name="minPercentage"
                      type="number"
                      size="small"
                      required
                      slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
                    />
                  </FormControl>
                  <Button
                    type="submit"
                    size="small"
                    variant="outlined"
                    startIcon={<AddRounded />}
                    sx={{ mb: 0.25 }}
                  >
                    Add
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Card>

          {/* Checkpoint Max Point Overrides */}
          {perCheckpointCategories.length > 0 && courseCheckpoints.length > 0 && (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Checkpoint Max Point Overrides
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Override the max points for a specific category on a specific
                  checkpoint. Leave blank to use the category default. Overridden
                  values are highlighted in the grading view.
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Checkpoint</TableCell>
                        {perCheckpointCategories.map((cat) => (
                          <TableCell key={cat.id} sx={{ fontWeight: 700 }}>
                            {cat.name}
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ display: "block", color: "text.secondary" }}
                            >
                              default: {cat.maxPoints}
                            </Typography>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {courseCheckpoints.map((cp) => (
                        <TableRow key={cp.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {cp.name}
                            </Typography>
                          </TableCell>
                          {perCheckpointCategories.map((cat) => {
                            const override =
                              config.checkpointOverrides?.[cp.id]?.[cat.id];
                            return (
                              <TableCell key={cat.id}>
                                <form
                                  action={setCheckpointCategoryMaxPoints.bind(
                                    null,
                                    courseId,
                                    cp.id,
                                    cat.id
                                  )}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                    }}
                                  >
                                    <TextField
                                      name="maxPoints"
                                      type="number"
                                      size="small"
                                      defaultValue={override?.maxPoints ?? ""}
                                      placeholder={String(cat.maxPoints)}
                                      slotProps={{
                                        htmlInput: { min: 0, step: 0.5 },
                                      }}
                                      sx={{
                                        width: 88,
                                        "& input": override
                                          ? { color: "warning.main", fontWeight: 600 }
                                          : undefined,
                                      }}
                                    />
                                    <IconButton type="submit" size="small">
                                      <Save fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </form>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
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

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Ignored GitHub Usernames
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Pull request activity from these GitHub accounts will be
                silently ignored during analysis (e.g. bots, CI users).
              </Typography>
              {course.ignoredGithubUsernames.length > 0 && (
                <Stack direction="row" sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
                  {course.ignoredGithubUsernames.map((username) => (
                    <form
                      key={username}
                      action={removeIgnoredGithubUsername.bind(
                        null,
                        courseId,
                        username
                      )}
                    >
                      <Chip
                        size="small"
                        label={username}
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
                        sx={{ fontFamily: "monospace" }}
                      />
                    </form>
                  ))}
                </Stack>
              )}
              <Divider sx={{ my: 2 }} />
              <form action={addIgnoredGithubUsernameWithId}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    name="ignoredGithubUsername"
                    placeholder="github-login"
                    size="small"
                    sx={{ flex: 1 }}
                    slotProps={{
                      input: { sx: { fontFamily: "monospace" } },
                    }}
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
