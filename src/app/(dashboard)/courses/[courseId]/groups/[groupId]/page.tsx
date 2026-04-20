import AppLink from "@/components/AppLink";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  courses,
  courseCollaborators,
  studentGroups,
  students,
  repositories,
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
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Link from "@mui/joy/Link";
import Table from "@mui/joy/Table";
import Input from "@mui/joy/Input";
import IconButton from "@mui/joy/IconButton";
import Divider from "@mui/joy/Divider";
import Chip from "@mui/joy/Chip";
import HomeRounded from "@mui/icons-material/HomeRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; groupId: string }>;
}) {
  const { courseId, groupId } = await params;
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

  const addStudentWithIds = addStudent.bind(null, groupId, courseId);
  const addRepoWithIds = addRepository.bind(null, groupId, courseId);
  const deleteGroupWithIds = deleteGroup.bind(null, groupId, courseId);
  const renameGroupWithIds = renameGroup.bind(null, groupId, courseId);

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          <HomeRounded />
        </AppLink>
        <AppLink href="/courses">Courses</AppLink>
        <AppLink href={`/courses/${courseId}`}>{course.name}</AppLink>
        <Typography>{group.name}</Typography>
      </Breadcrumbs>
      <Typography level="h2" sx={{ mb: 3 }}>
        {group.name}
      </Typography>
      {/* Rename */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="title-lg" sx={{ mb: 2 }}>
            Rename Group
          </Typography>
          <form action={renameGroupWithIds}>
            <Stack direction="row" spacing={1}>
              <Input
                name="name"
                defaultValue={group.name}
                required
                sx={{ flex: 1 }}
              />
              <Button type="submit" size="sm">
                Rename
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
      {/* Students */}{" "}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="title-lg" sx={{ mb: 2 }}>
            Students
          </Typography>
          {studentList.length > 0 && (
            <Table sx={{ mb: 2 }}>
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Email</th>
                  <th>Git Email Aliases</th>
                  <th style={{ width: 60 }} />
                </tr>
              </thead>
              <tbody>
                {studentList.map((student) => (
                  <tr key={student.id}>
                    <td>{student.displayName}</td>
                    <td>{student.email}</td>
                    <td>
                      <Stack spacing={0.5}>
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {student.gitEmails.map((alias) => (
                            <form
                              key={alias}
                              action={removeStudentGitEmail.bind(
                                null,
                                student.id,
                                courseId,
                                alias
                              )}
                            >
                              <Chip
                                size="sm"
                                variant="soft"
                                color="neutral"
                                endDecorator={
                                  <IconButton
                                    type="submit"
                                    size="sm"
                                    variant="plain"
                                    color="neutral"
                                    sx={{ borderRadius: "50%" }}
                                  >
                                    ×
                                  </IconButton>
                                }
                              >
                                {alias}
                              </Chip>
                            </form>
                          ))}
                        </Stack>
                        <form
                          action={addStudentGitEmail.bind(
                            null,
                            student.id,
                            courseId
                          )}
                        >
                          <Stack direction="row" spacing={0.5}>
                            <Input
                              name="gitEmail"
                              placeholder="Add git email"
                              size="sm"
                              type="email"
                              sx={{ flex: 1, minWidth: 180 }}
                            />
                            <Button type="submit" size="sm" variant="outlined">
                              Add
                            </Button>
                          </Stack>
                        </form>
                      </Stack>
                    </td>
                    <td>
                      <form
                        action={removeStudent.bind(null, student.id, courseId)}
                      >
                        <IconButton
                          type="submit"
                          size="sm"
                          color="danger"
                          variant="plain"
                        >
                          <DeleteRounded />
                        </IconButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Divider sx={{ my: 2 }} />
          <form action={addStudentWithIds}>
            <Stack direction="row" spacing={1}>
              <Input
                name="displayName"
                placeholder="Display name"
                sx={{ flex: 1 }}
              />
              <Input
                name="email"
                placeholder="Email"
                type="email"
                sx={{ flex: 1 }}
              />
              <Button type="submit" size="sm">
                Add
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
      {/* Repositories */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="title-lg" sx={{ mb: 2 }}>
            Repositories
          </Typography>
          {repoList.length > 0 && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {repoList.map((repo) => (
                <Stack
                  key={repo.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Link
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {repo.url}
                  </Link>
                  <form action={removeRepository.bind(null, repo.id, courseId)}>
                    <IconButton
                      type="submit"
                      size="sm"
                      color="danger"
                      variant="plain"
                    >
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
              <Input
                name="url"
                placeholder="Repository URL"
                type="url"
                sx={{ flex: 1 }}
              />
              <Button type="submit" size="sm">
                Add
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
      {/* Checkpoints */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography level="title-lg">Checkpoints</Typography>
            <AppLink
              href={`/courses/${courseId}/groups/${groupId}/checkpoints`}
            >
              View Analysis
            </AppLink>
          </Stack>
        </CardContent>
      </Card>
      {/* Danger Zone */}
      <Card variant="outlined" color="danger">
        <CardContent>
          <Typography level="title-lg" color="danger" sx={{ mb: 1 }}>
            Danger Zone
          </Typography>
          <Typography level="body-sm" sx={{ mb: 2 }}>
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
  );
}
