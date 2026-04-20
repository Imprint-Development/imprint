import AppLink from "@/components/AppLink";
import { db } from "@/lib/db";
import { courses, courseCollaborators } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/joy/Typography";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Box from "@mui/joy/Box";
import Sheet from "@mui/joy/Sheet";

export default async function GradingOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const myCourses = await db
    .select({
      id: courses.id,
      name: courses.name,
      semester: courses.semester,
    })
    .from(courseCollaborators)
    .innerJoin(courses, eq(courses.id, courseCollaborators.courseId))
    .where(eq(courseCollaborators.userId, session.user.id));

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          Home
        </AppLink>
        <Typography>Grading</Typography>
      </Breadcrumbs>

      <Typography level="h2" sx={{ mb: 3 }}>
        Grading
      </Typography>

      {myCourses.length === 0 ? (
        <Sheet
          variant="soft"
          sx={{ p: 4, borderRadius: "sm", textAlign: "center" }}
        >
          <Typography>No courses found.</Typography>
        </Sheet>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "1fr 1fr",
              lg: "1fr 1fr 1fr",
            },
            gap: 2,
          }}
        >
          {myCourses.map((course) => (
            <AppLink
              key={course.id}
              href={`/grading/${course.id}`}
              sx={{ textDecoration: "none" }}
            >
              <Card
                sx={{
                  "&:hover": { boxShadow: "md" },
                }}
              >
                <CardContent>
                  <Typography level="title-lg">{course.name}</Typography>
                  <Typography level="body-sm">{course.semester}</Typography>
                </CardContent>
              </Card>
            </AppLink>
          ))}
        </Box>
      )}
    </Box>
  );
}
