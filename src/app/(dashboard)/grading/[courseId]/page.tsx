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
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
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

  const groupTotals = new Map<string, { points: number; maxPoints: number }>();
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
        <AppLink href="/">Home</AppLink>
        <AppLink href="/grading">Grading</AppLink>
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
        <Typography variant="h5">{course.name} — Grading</Typography>
        <Button
          component="a"
          href={`/api/grading/${courseId}/export`}
          startIcon={<FileDownload />}
          variant="outlined"
        >
          Export CSV
        </Button>
      </Box>

      {courseCheckpoints.length === 0 || groups.length === 0 ? (
        <Alert severity="info">
          Add checkpoints and groups to this course before grading.
        </Alert>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ overflow: "auto" }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Group</TableCell>
                {courseCheckpoints.map((cp) => (
                  <TableCell key={cp.id}>{cp.name}</TableCell>
                ))}
                <TableCell>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {group.name}
                    </Typography>
                  </TableCell>
                  {courseCheckpoints.map((cp) => {
                    const existing = gradeMap.get(`${cp.id}:${group.id}`);
                    return (
                      <TableCell key={cp.id}>
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
                            <TextField
                              size="small"
                              type="number"
                              name="points"
                              slotProps={{ htmlInput: { step: 0.5, min: 0 } }}
                              defaultValue={existing?.points ?? ""}
                              placeholder="Pts"
                              required
                              sx={{ width: 64 }}
                            />
                            <Typography variant="caption">/</Typography>
                            <TextField
                              size="small"
                              type="number"
                              name="maxPoints"
                              slotProps={{ htmlInput: { step: 0.5, min: 0 } }}
                              defaultValue={existing?.maxPoints ?? ""}
                              placeholder="Max"
                              required
                              sx={{ width: 64 }}
                            />
                            <IconButton type="submit" size="small">
                              <Save fontSize="small" />
                            </IconButton>
                          </Box>
                        </form>
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    {(() => {
                      const t = groupTotals.get(group.id);
                      if (!t || t.maxPoints === 0) return "—";
                      const pct = ((t.points / t.maxPoints) * 100).toFixed(1);
                      return (
                        <Typography variant="body2">
                          {t.points}/{t.maxPoints}{" "}
                          <Typography component="span" variant="caption">
                            ({pct}%)
                          </Typography>
                        </Typography>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <tr>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Totals
                  </Typography>
                </TableCell>
                {courseCheckpoints.map((cp) => {
                  let pts = 0;
                  let max = 0;
                  for (const group of groups) {
                    const g = gradeMap.get(`${cp.id}:${group.id}`);
                    if (g) {
                      pts += g.points;
                      max += g.maxPoints;
                    }
                  }
                  return (
                    <TableCell key={cp.id}>
                      <Typography variant="body2">
                        {pts}/{max}
                      </Typography>
                    </TableCell>
                  );
                })}
                <TableCell>
                  {(() => {
                    let pts = 0;
                    let max = 0;
                    for (const t of groupTotals.values()) {
                      pts += t.points;
                      max += t.maxPoints;
                    }
                    if (max === 0) return "—";
                    return (
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {pts}/{max} ({((pts / max) * 100).toFixed(1)}%)
                      </Typography>
                    );
                  })()}
                </TableCell>
              </tr>
            </tfoot>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
