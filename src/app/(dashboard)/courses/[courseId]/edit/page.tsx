import AppLink from "@/components/AppLink";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, courseCollaborators } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateCourse, deleteCourse } from "@/lib/actions/courses";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Link from "@mui/joy/Link";
import HomeRounded from "@mui/icons-material/HomeRounded";

export default async function EditCoursePage({
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

  const updateCourseWithId = updateCourse.bind(null, courseId);
  const deleteCourseWithId = deleteCourse.bind(null, courseId);

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          <HomeRounded />
        </AppLink>
        <AppLink href="/courses">Courses</AppLink>
        <AppLink href={`/courses/${courseId}`}>{course.name}</AppLink>
        <Typography>Edit</Typography>
      </Breadcrumbs>

      <Typography level="h2" sx={{ mb: 3 }}>
        Edit Course
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <form action={updateCourseWithId}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Course Name</FormLabel>
                <Input name="name" defaultValue={course.name} />
              </FormControl>
              <FormControl required>
                <FormLabel>Semester</FormLabel>
                <Input name="semester" defaultValue={course.semester} />
              </FormControl>
              <Button type="submit">Save Changes</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>

      <Card variant="outlined" color="danger">
        <CardContent>
          <Typography level="title-lg" color="danger" sx={{ mb: 1 }}>
            Danger Zone
          </Typography>
          <Typography level="body-sm" sx={{ mb: 2 }}>
            Deleting a course is permanent and cannot be undone.
          </Typography>
          <form action={deleteCourseWithId}>
            <Button type="submit" color="danger" variant="solid">
              Delete Course
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
