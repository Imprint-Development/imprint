import ButtonLink from "@/components/ButtonLink";
import AppLink from "@/components/AppLink";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, courseCollaborators } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Breadcrumbs from "@mui/material/Breadcrumbs";
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
          <HomeRounded fontSize="small" />
        </AppLink>
        <Typography>Courses</Typography>
      </Breadcrumbs>

      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}
      >
        <Typography variant="h5">Courses</Typography>
        <ButtonLink href="/courses/new" startIcon={<AddRounded />}>
          Create Course
        </ButtonLink>
      </Stack>

      {userCourses.length === 0 ? (
        <Stack sx={{ alignItems: "center", py: 8 }} spacing={2}>
          <Typography variant="body1" color="text.secondary">
            No courses yet.
          </Typography>
          <ButtonLink href="/courses/new" startIcon={<AddRounded />}>
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
            <AppLink
              key={course.id}
              href={`/courses/${course.id}`}
              sx={{
                textDecoration: "none",
                color: "inherit",
                display: "block",
              }}
            >
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  "&:hover": { boxShadow: 3 },
                  transition: "box-shadow 0.2s",
                }}
              >
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="h6">{course.name}</Typography>
                    <Chip
                      size="small"
                      label={course.semester}
                      color="primary"
                      variant="outlined"
                    />
                    <Typography variant="body2" color="text.secondary">
                      Created {course.createdAt?.toLocaleDateString()}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </AppLink>
          ))}
        </Box>
      )}
    </Box>
  );
}
