import ButtonLink from "@/components/ButtonLink";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, courseCollaborators } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import MuiLink from "@mui/material/Link";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import AddRounded from "@mui/icons-material/AddRounded";
import AppLink from "@/components/AppLink";

export default async function CoursesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userCourses = await db
    .select({ course: courses })
    .from(courseCollaborators)
    .innerJoin(courses, eq(courses.id, courseCollaborators.courseId))
    .where(eq(courseCollaborators.userId, session.user.id));

  const sorted = [...userCourses].sort((a, b) =>
    a.course.name.localeCompare(b.course.name)
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageBreadcrumbs items={[{ label: "Course management" }]} />

      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}
      >
        <Typography variant="h5">Courses</Typography>
        <ButtonLink href="/courses/new" startIcon={<AddRounded />}>
          Create Course
        </ButtonLink>
      </Stack>

      {sorted.length === 0 ? (
        <Stack sx={{ alignItems: "center", py: 8 }} spacing={2}>
          <Typography variant="body1" color="text.secondary">
            No courses yet.
          </Typography>
          <ButtonLink href="/courses/new" startIcon={<AddRounded />}>
            Create your first course
          </ButtonLink>
        </Stack>
      ) : (
        <TableContainer
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Semester</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map(({ course }) => (
                <TableRow
                  key={course.id}
                  hover
                  sx={{ cursor: "pointer", position: "relative" }}
                >
                  <TableCell>
                    <MuiLink
                      component={AppLink}
                      href={`/courses/${course.id}`}
                      underline="hover"
                      color="text.primary"
                      sx={{
                        fontWeight: 500,
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          inset: 0,
                        },
                      }}
                    >
                      {course.name}
                    </MuiLink>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {course.semester}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
