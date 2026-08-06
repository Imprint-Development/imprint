import PathTabNav from "@/components/PathTabNav";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, courseCollaborators } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";

export default async function CourseOverviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [[membership], [course]] = await Promise.all([
    db
      .select()
      .from(courseCollaborators)
      .where(
        and(
          eq(courseCollaborators.courseId, courseId),
          eq(courseCollaborators.userId, session.user.id)
        )
      )
      .limit(1),
    db.select().from(courses).where(eq(courses.id, courseId)).limit(1),
  ]);

  if (!membership) redirect("/courses");
  if (!course) redirect("/courses");

  const tabs = [
    { label: "Groups", href: `/courses/${courseId}/groups` },
    { label: "Checkpoints", href: `/courses/${courseId}/checkpoints` },
    { label: "Grading", href: `/courses/${courseId}/grading` },
    { label: "Grading Config", href: `/courses/${courseId}/grading-config` },
    { label: "Collaborators", href: `/courses/${courseId}/collaborators` },
    { label: "AI Analysis", href: `/courses/${courseId}/ai-analysis` },
    { label: "Settings", href: `/courses/${courseId}/settings` },
  ];

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

      <PathTabNav tabs={tabs} />

      {children}
    </Box>
  );
}
