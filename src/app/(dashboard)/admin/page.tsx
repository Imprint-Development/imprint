import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { analysisQueue } from "@/lib/queue";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import TabNav from "@/components/TabNav";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";

const TABS = [
  { label: "Users", value: "users" },
  { label: "Worker Runs", value: "runs" },
];

const JOB_STATUS_COLOR: Record<
  string,
  "default" | "primary" | "success" | "error" | "warning"
> = {
  completed: "success",
  failed: "error",
  active: "primary",
  waiting: "default",
  delayed: "warning",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Role check — fetch fresh from DB (don't trust session alone)
  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (currentUser?.role !== "admin") redirect("/dashboard");

  const { tab = "users" } = await searchParams;

  // ── Users ────────────────────────────────────────────────────────────────
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  // ── Worker runs ──────────────────────────────────────────────────────────
  type JobRow = {
    id: string;
    name: string;
    state: string;
    checkpointId: string;
    courseId: string;
    groupId?: string;
    finishedOn?: number;
    processedOn?: number;
    failedReason?: string;
  };

  let jobRows: JobRow[] = [];

  try {
    const jobs = await analysisQueue.getJobs(
      ["completed", "failed", "active", "waiting", "delayed"],
      0,
      49
    );

    jobRows = await Promise.all(
      jobs.map(async (job) => {
        const state = await job.getState();
        return {
          id: job.id ?? "",
          name: job.name,
          state,
          checkpointId: job.data.checkpointId,
          courseId: job.data.courseId,
          groupId: job.data.groupId,
          finishedOn: job.finishedOn,
          processedOn: job.processedOn,
          failedReason: job.failedReason,
        };
      })
    );

    // Most recent first
    jobRows.sort((a, b) => (b.processedOn ?? 0) - (a.processedOn ?? 0));
  } catch {
    // Redis may not be available at render time — show empty state
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Admin
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
        System overview — visible to admins only.
      </Typography>

      <TabNav tabs={TABS} defaultTab="users" />

      {/* ── Users tab ── */}
      {tab === "users" && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Registered</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name ?? "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.role ?? "lecturer"}
                      size="small"
                      color={u.role === "admin" ? "primary" : "default"}
                      variant={u.role === "admin" ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell>{u.createdAt?.toLocaleString() ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Worker runs tab ── */}
      {tab === "runs" && (
        <>
          {jobRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No recent jobs found. Redis may be unavailable or the queue is
              empty.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Job ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Checkpoint</TableCell>
                    <TableCell>Group</TableCell>
                    <TableCell>Started</TableCell>
                    <TableCell>Finished</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobRows.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                        >
                          {job.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={job.state}
                          size="small"
                          color={JOB_STATUS_COLOR[job.state] ?? "default"}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                        >
                          {job.checkpointId.slice(0, 8)}…
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {job.groupId ? (
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                            }}
                          >
                            {job.groupId.slice(0, 8)}…
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            all groups
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.processedOn
                          ? new Date(job.processedOn).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {job.finishedOn
                          ? new Date(job.finishedOn).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {job.failedReason ? (
                          <Typography
                            variant="body2"
                            color="error"
                            sx={{
                              maxWidth: 240,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={job.failedReason}
                          >
                            {job.failedReason}
                          </Typography>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
}
