import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, courses, checkpoints, studentGroups } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import DebugRunnerForm from "./DebugRunnerForm";

export default async function AdminDebugPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (currentUser?.role !== "admin") redirect("/dashboard");

  const allCourses = await db
    .select({ id: courses.id, name: courses.name, semester: courses.semester })
    .from(courses)
    .orderBy(courses.name);

  const allCheckpoints = await db
    .select({
      id: checkpoints.id,
      name: checkpoints.name,
      courseId: checkpoints.courseId,
      status: checkpoints.status,
    })
    .from(checkpoints)
    .orderBy(checkpoints.createdAt);

  const allGroups = await db
    .select({
      id: studentGroups.id,
      name: studentGroups.name,
      courseId: studentGroups.courseId,
    })
    .from(studentGroups)
    .orderBy(studentGroups.name);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Debug — Pipeline Runner
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Manually trigger a pipeline run against any checkpoint. Jobs are
        enqueued into the normal worker queue — check the{" "}
        <strong>Worker Runs</strong> tab on the Admin page to monitor progress.
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        This will enqueue a real analysis job. It does <strong>not</strong>{" "}
        clear prior results — use the checkpoint&apos;s own Rerun button for a
        clean run.
      </Alert>

      <DebugRunnerForm
        courses={allCourses}
        checkpoints={allCheckpoints}
        groups={allGroups}
      />
    </Box>
  );
}
