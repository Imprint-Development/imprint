import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, courseCollaborators } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import AppLink from "@/components/AppLink";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";

export default async function DashboardIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userCourses = await db
    .select({ id: courses.id, name: courses.name, semester: courses.semester })
    .from(courseCollaborators)
    .innerJoin(courses, eq(courses.id, courseCollaborators.courseId))
    .where(eq(courseCollaborators.userId, session.user.id));

  // Single course — go straight to the dashboard
  if (userCourses.length === 1) {
    redirect(`/courses/${userCourses[0]!.id}/dashboard`);
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Welcome back, {session.user.name ?? "User"}
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: "text.secondary" }}>
        {userCourses.length > 0
          ? "Select a course to view its dashboard."
          : "No courses yet."}
      </Typography>

      {userCourses.length === 0 ? (
        <Alert severity="info">
          No courses yet.{" "}
          <AppLink href="/courses/new">Create your first course</AppLink> to get
          started.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 2,
          }}
        >
          {userCourses.map((c) => (
            <Card key={c.id} variant="outlined" sx={{ textDecoration: "none" }}>
              <CardActionArea href={`/courses/${c.id}/dashboard`}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 0.5 }}>
                    {c.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={c.semester}
                    color="primary"
                    variant="outlined"
                  />
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
