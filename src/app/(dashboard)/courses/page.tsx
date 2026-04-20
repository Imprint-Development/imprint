import ButtonLink from "@/components/ButtonLink";
import AppLink from "@/components/AppLink";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, courseCollaborators } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Chip from "@mui/joy/Chip";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import AddRounded from "@mui/icons-material/AddRounded";
import HomeRounded from "@mui/icons-material/HomeRounded";

export default async function CoursesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userCourses = await db
    .select({ course: courses })
    .from(courseCollaborators)
    .innerJoin(courses, eq(courses.id, courseCollaborators.courseId))
    .where(eq(courseCollaborators.userId, session.user.id));

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          <HomeRounded />
        </AppLink>
        <Typography>Courses</Typography>
      </Breadcrumbs>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography level="h2">Courses</Typography>
        <ButtonLink
          href="/courses/new"
          startDecorator={<AddRounded />}
        >
          Create Course
        </ButtonLink>
      </Stack>

      {userCourses.length === 0 ? (
        <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
          <Typography level="body-lg" color="neutral">
            No courses yet.
          </Typography>
          <ButtonLink href="/courses/new" startDecorator={<AddRounded />}>
            Create your first course
          </ButtonLink>
        </Stack>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 2,
          }}
        >
          {userCourses.map(({ course }) => (
            <Card key={course.id} variant="outlined">
              <CardContent>
                <Stack spacing={1}>
                  <Typography level="title-lg">{course.name}</Typography>
                  <Chip size="sm" variant="soft" color="primary">
                    {course.semester}
                  </Chip>
                  <Typography level="body-sm" color="neutral">
                    Created {course.createdAt?.toLocaleDateString()}
                  </Typography>
                  <AppLink href={`/courses/${course.id}`}>
                    View
                  </AppLink>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
