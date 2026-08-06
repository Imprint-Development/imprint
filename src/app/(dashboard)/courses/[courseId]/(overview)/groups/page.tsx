import ButtonLink from "@/components/ButtonLink";
import ImportCsvButton from "@/components/ImportCsvButton";
import { db } from "@/lib/db";
import { studentGroups, students, repositories } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import AddRounded from "@mui/icons-material/AddRounded";
import GroupsTable from "../../groups/GroupsTable";

export default async function GroupsTabPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const groups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, courseId));

  const groupIds = groups.map((g) => g.id);

  const [studentRows, repoRows] =
    groupIds.length > 0
      ? await Promise.all([
          db
            .select({
              id: students.id,
              displayName: students.displayName,
              email: students.email,
              groupId: students.groupId,
            })
            .from(students)
            .where(inArray(students.groupId, groupIds)),
          db
            .select({
              id: repositories.id,
              url: repositories.url,
              groupId: repositories.groupId,
            })
            .from(repositories)
            .where(inArray(repositories.groupId, groupIds)),
        ])
      : [[], []];

  const studentsByGroup = new Map<string, typeof studentRows>();
  for (const s of studentRows) {
    if (!s.groupId) continue;
    const list = studentsByGroup.get(s.groupId) ?? [];
    list.push(s);
    studentsByGroup.set(s.groupId, list);
  }

  const reposByGroup = new Map<string, typeof repoRows>();
  for (const r of repoRows) {
    if (!r.groupId) continue;
    const list = reposByGroup.get(r.groupId) ?? [];
    list.push(r);
    reposByGroup.set(r.groupId, list);
  }

  const groupsWithDetails = groups.map((g) => ({
    id: g.id,
    name: g.name,
    students: studentsByGroup.get(g.id) ?? [],
    repos: reposByGroup.get(g.id) ?? [],
  }));

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Student Groups</Typography>
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
