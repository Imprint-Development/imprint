import AppLink from "@/components/AppLink";
import ButtonLink from "@/components/ButtonLink";
import ImportCsvButton from "@/components/ImportCsvButton";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  courses,
  courseCollaborators,
  studentGroups,
  students,
  users,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { addCollaborator, removeCollaborator } from "@/lib/actions/courses";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Chip from "@mui/joy/Chip";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Table from "@mui/joy/Table";
import Input from "@mui/joy/Input";
import IconButton from "@mui/joy/IconButton";
import Divider from "@mui/joy/Divider";
import HomeRounded from "@mui/icons-material/HomeRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import AddRounded from "@mui/icons-material/AddRounded";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
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

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          <HomeRounded />
        </AppLink>
        <AppLink href="/courses">
          Courses
        </AppLink>
        <Typography>{course.name}</Typography>
      </Breadcrumbs>

      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Typography level="h2">{course.name}</Typography>
        <Chip size="sm" variant="soft" color="primary">
          {course.semester}
        </Chip>
        <AppLink href={`/courses/${courseId}/edit`} sx={{ textDecoration: 'none' }}>
          <IconButton variant="plain">
            <EditRounded />
          </IconButton>
        </AppLink>
      </Stack>

      {/* Student Groups */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography level="title-lg">Student Groups</Typography>
            <Stack direction="row" spacing={1}>
              <ImportCsvButton courseId={courseId} />
              <ButtonLink
                href={`/courses/${courseId}/groups/new`}
                size="sm"
                startDecorator={<AddRounded />}
              >
                Add Group
              </ButtonLink>
            </Stack>
          </Stack>
          {groupsWithCounts.length === 0 ? (
            <Typography level="body-sm" color="neutral">
              No groups yet.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {groupsWithCounts.map((group) => (
                <Stack
                  key={group.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <AppLink href={`/courses/${courseId}/groups/${group.id}`}>
                    {group.name}
                  </AppLink>
                  <Typography level="body-sm" color="neutral">
                    {group.studentCount} student{group.studentCount !== 1 ? "s" : ""}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Checkpoints */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography level="title-lg">Checkpoints</Typography>
            <ButtonLink
              href={`/courses/${courseId}/checkpoints`}
              size="sm"
              variant="outlined"
            >
              View Checkpoints
            </ButtonLink>
          </Stack>
        </CardContent>
      </Card>

      {/* Collaborators */}
      <Card variant="outlined">
        <CardContent>
          <Typography level="title-lg" sx={{ mb: 2 }}>
            Collaborators
          </Typography>
          <Table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {collaborators.map((collab) => (
                <tr key={collab.id}>
                  <td>{collab.email}</td>
                  <td>
                    <Chip size="sm" variant="soft">
                      {collab.role}
                    </Chip>
                  </td>
                  <td>
                    <form action={removeCollaborator.bind(null, collab.id, courseId)}>
                      <IconButton type="submit" size="sm" color="danger" variant="plain">
                        <DeleteRounded />
                      </IconButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Divider sx={{ my: 2 }} />
          <form action={addCollaboratorWithId}>
            <Stack direction="row" spacing={1}>
              <Input name="email" placeholder="Email address" type="email" sx={{ flex: 1 }} />
              <Button type="submit" size="sm">
                Add
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
