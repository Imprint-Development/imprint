import ButtonLink from "@/components/ButtonLink";
import ImportCsvButton from "@/components/ImportCsvButton";
import { db } from "@/lib/db";
import {
  courses,
  studentGroups,
  students,
  repositories,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/material/Typography";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import AddRounded from "@mui/icons-material/AddRounded";
import GroupsTable from "./GroupsTable";

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { courseId } = await params;

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) redirect("/courses");

  const groups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, courseId));

  const groupsWithDetails = await Promise.all(
    groups.map(async (group) => {
      const studentList = await db
        .select({
          id: students.id,
          displayName: students.displayName,
          email: students.email,
        })
        .from(students)
        .where(eq(students.groupId, group.id));
      const repoList = await db
        .select({ id: repositories.id, url: repositories.url })
        .from(repositories)
        .where(eq(repositories.groupId, group.id));
      return {
        id: group.id,
        name: group.name,
        students: studentList,
        repos: repoList,
      };
    })
  );

  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs items={[{ label: "Groups" }]} />

      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">Student Groups</Typography>
        <Stack direction="row" spacing={1}>
          <ImportCsvButton courseId={courseId} />
          <ButtonLink
            href={`/courses/${courseId}/groups/new`}
            size="small"
            startIcon={<AddRounded />}
          >
            Add Group
          </ButtonLink>
        </Stack>
      </Stack>

      {groupsWithDetails.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No groups yet. Create one or import from CSV.
        </Typography>
      ) : (
        <GroupsTable groups={groupsWithDetails} courseId={courseId} />
      )}
    </Box>
  );
}
