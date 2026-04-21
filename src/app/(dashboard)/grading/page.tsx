import AppLink from "@/components/AppLink";
import { db } from "@/lib/db";
import { courses, courseCollaborators } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Link from "next/link";

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
        <AppLink href="/">Home</AppLink>
        <Typography>Grading</Typography>
      </Breadcrumbs>

      <Typography variant="h5" sx={{ mb: 3 }}>
        Grading
      </Typography>

      {myCourses.length === 0 ? (
        <Alert severity="info">No courses found.</Alert>
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
            <Card key={course.id} variant="outlined">
              <CardActionArea component={Link} href={`/grading/${course.id}`}>
                <CardContent>
                  <Typography variant="h6">{course.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {course.semester}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
