import AppLink from "@/components/AppLink";
import { db } from "@/lib/db";
import {
  courses,
  courseCollaborators,
  checkpoints,
  studentGroups,
  grades,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { saveGrade } from "@/lib/actions/grading";
import Typography from "@mui/joy/Typography";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Link from "@mui/joy/Link";
import Button from "@mui/joy/Button";
import Input from "@mui/joy/Input";
import IconButton from "@mui/joy/IconButton";
import Table from "@mui/joy/Table";
import Sheet from "@mui/joy/Sheet";
import Box from "@mui/joy/Box";
import Save from "@mui/icons-material/Save";
import FileDownload from "@mui/icons-material/FileDownload";

export default async function CourseGradingPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { courseId } = await params;

  const [membership] = await db
    .select()
    .from(courseCollaborators)
    .where(
      and(
        eq(courseCollaborators.courseId, courseId),
        eq(courseCollaborators.userId, session.user.id)
      )
    );
  if (!membership) redirect("/grading");

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId));
  if (!course) redirect("/grading");

  const courseCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.courseId, courseId));

  const groups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, courseId));

  const allGrades = await db.select().from(grades);
  const checkpointIds = new Set(courseCheckpoints.map((c) => c.id));
  const courseGrades = allGrades.filter((g) =>
    checkpointIds.has(g.checkpointId!)
  );

  const gradeMap = new Map<string, (typeof courseGrades)[number]>();
  for (const g of courseGrades) {
    gradeMap.set(`${g.checkpointId}:${g.groupId}`, g);
  }

  const groupTotals = new Map<
    string,
    { points: number; maxPoints: number }
  >();
  for (const group of groups) {
    let points = 0;
    let maxPoints = 0;
    for (const cp of courseCheckpoints) {
      const g = gradeMap.get(`${cp.id}:${group.id}`);
      if (g) {
        points += g.points;
        maxPoints += g.maxPoints;
      }
    }
    groupTotals.set(group.id, { points, maxPoints });
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          Home
        </AppLink>
        <AppLink href="/grading">
          Grading
        </AppLink>
        <Typography>{course.name}</Typography>
      </Breadcrumbs>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography level="h2">{course.name} — Grading</Typography>
        <Button
          component="a"
          href={`/api/grading/${courseId}/export`}
          startDecorator={<FileDownload />}
          variant="outlined"
        >
          Export CSV
        </Button>
      </Box>

      {courseCheckpoints.length === 0 || groups.length === 0 ? (
        <Sheet
          variant="soft"
          sx={{ p: 4, borderRadius: "sm", textAlign: "center" }}
        >
          <Typography>
            Add checkpoints and groups to this course before grading.
          </Typography>
        </Sheet>
      ) : (
        <Sheet
          variant="outlined"
          sx={{ borderRadius: "sm", overflow: "auto" }}
        >
          <Table size="sm">
            <thead>
              <tr>
                <th>Group</th>
                {courseCheckpoints.map((cp) => (
                  <th key={cp.id}>{cp.name}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id}>
                  <td>
                    <Typography level="body-sm" fontWeight="lg">
                      {group.name}
                    </Typography>
                  </td>
                  {courseCheckpoints.map((cp) => {
                    const existing = gradeMap.get(
                      `${cp.id}:${group.id}`
                    );
                    return (
                      <td key={cp.id}>
                        <form action={saveGrade}>
                          <input
                            type="hidden"
                            name="checkpointId"
                            value={cp.id}
                          />
                          <input
                            type="hidden"
                            name="groupId"
                            value={group.id}
                          />
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Input
                              size="sm"
                              type="number"
                              name="points"
                              slotProps={{ input: { step: 0.5, min: 0 } }}
                              defaultValue={
                                existing?.points ?? ""
                              }
                              placeholder="Pts"
                              required
                              sx={{ width: 64 }}
                            />
                            <Typography level="body-xs">
                              /
                            </Typography>
                            <Input
                              size="sm"
                              type="number"
                              name="maxPoints"
                              slotProps={{ input: { step: 0.5, min: 0 } }}
                              defaultValue={
                                existing?.maxPoints ?? ""
                              }
                              placeholder="Max"
                              required
                              sx={{ width: 64 }}
                            />
                            <IconButton
                              type="submit"
                              size="sm"
                              variant="plain"
                            >
                              <Save fontSize="small" />
                            </IconButton>
                          </Box>
                        </form>
                      </td>
                    );
                  })}
                  <td>
                    {(() => {
                      const t = groupTotals.get(group.id);
                      if (!t || t.maxPoints === 0) return "—";
                      const pct = (
                        (t.points / t.maxPoints) *
                        100
                      ).toFixed(1);
                      return (
                        <Typography level="body-sm">
                          {t.points}/{t.maxPoints}{" "}
                          <Typography level="body-xs">
                            ({pct}%)
                          </Typography>
                        </Typography>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <Typography level="body-sm" fontWeight="lg">
                    Totals
                  </Typography>
                </td>
                {courseCheckpoints.map((cp) => {
                  let pts = 0;
                  let max = 0;
                  for (const group of groups) {
                    const g = gradeMap.get(
                      `${cp.id}:${group.id}`
                    );
                    if (g) {
                      pts += g.points;
                      max += g.maxPoints;
                    }
                  }
                  return (
                    <td key={cp.id}>
                      <Typography level="body-sm">
                        {pts}/{max}
                      </Typography>
                    </td>
                  );
                })}
                <td>
                  {(() => {
                    let pts = 0;
                    let max = 0;
                    for (const t of groupTotals.values()) {
                      pts += t.points;
                      max += t.maxPoints;
                    }
                    if (max === 0) return "—";
                    return (
                      <Typography level="body-sm" fontWeight="lg">
                        {pts}/{max} (
                        {((pts / max) * 100).toFixed(1)}%)
                      </Typography>
                    );
                  })()}
                </td>
              </tr>
            </tfoot>
          </Table>
        </Sheet>
      )}
    </Box>
  );
}
