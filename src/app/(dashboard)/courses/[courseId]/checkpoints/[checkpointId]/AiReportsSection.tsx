"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Collapse from "@mui/material/Collapse";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import ReactMarkdown from "react-markdown";
import AppLink from "@/components/AppLink";

export interface AiReportRow {
  id: string;
  studentId: string | null;
  studentName: string | null;
  content: string;
  provider: string;
  model: string;
  createdAt: Date;
}

interface Props {
  reports: AiReportRow[];
  checkpointName: string;
  groupName: string;
  checkpointStatus: string;
  courseId: string;
  checkpointId: string;
}

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilename(s: string) {
  return s.replace(/[^a-z0-9_-]/gi, "_");
}

function ProviderChip({
  provider,
  model,
}: {
  provider: string;
  model: string;
}) {
  return (
    <Chip
      size="small"
      label={`${provider} / ${model}`}
      variant="outlined"
      color="primary"
      sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
    />
  );
}

function ReportCard({
  report,
  filename,
}: {
  report: AiReportRow;
  filename: string;
}) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        p: 2,
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.5,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ProviderChip provider={report.provider} model={report.model} />
          <Typography variant="caption" color="text.secondary">
            {new Date(report.createdAt).toLocaleString()}
          </Typography>
        </Stack>
        <Button
          size="small"
          startIcon={<DownloadIcon />}
          onClick={() => downloadMarkdown(report.content, filename)}
        >
          Download .md
        </Button>
      </Stack>
      <Divider sx={{ mb: 1.5 }} />
      <Box
        sx={{
          "& h1,& h2,& h3,& h4": { mt: 1.5, mb: 0.5, fontWeight: 600 },
          "& p": { mb: 1 },
          "& ul,& ol": { pl: 2.5, mb: 1 },
          "& code": {
            bgcolor: "action.hover",
            px: 0.5,
            borderRadius: 0.5,
            fontFamily: "monospace",
            fontSize: "0.85em",
          },
          "& pre": {
            bgcolor: "action.hover",
            p: 1.5,
            borderRadius: 1,
            overflow: "auto",
            mb: 1,
          },
        }}
      >
        <ReactMarkdown>{report.content}</ReactMarkdown>
      </Box>
    </Box>
  );
}

function ReportHistory({
  history,
  groupName,
  checkpointName,
  subjectLabel,
}: {
  history: AiReportRow[];
  groupName: string;
  checkpointName: string;
  subjectLabel: string;
}) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Button
        size="small"
        variant="text"
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        onClick={() => setOpen((v) => !v)}
      >
        {open
          ? "Hide older versions"
          : `Show ${history.length} older version${history.length > 1 ? "s" : ""}`}
      </Button>
      <Collapse in={open}>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {history.map((r, i) => (
            <ReportCard
              key={r.id}
              report={r}
              filename={`report_${safeFilename(groupName)}_${safeFilename(checkpointName)}_${safeFilename(subjectLabel)}_v${history.length - i}.md`}
            />
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

export default function AiReportsSection({
  reports,
  checkpointName,
  groupName,
  checkpointStatus,
  courseId,
  checkpointId,
}: Props) {
  const [activeTab, setActiveTab] = useState<string>("__group__");

  // Not yet run
  if (checkpointStatus !== "complete") {
    return (
      <Alert severity="warning">
        Analysis has not completed yet.{" "}
        <AppLink href={`/courses/${courseId}/checkpoints/${checkpointId}`}>
          Manage checkpoint
        </AppLink>
      </Alert>
    );
  }

  if (reports.length === 0) {
    return (
      <Alert severity="info">
        No AI reports generated yet. Enable the <strong>AI Report</strong>{" "}
        pipeline on this checkpoint and re-run analysis.
      </Alert>
    );
  }

  // Separate group summaries (studentId = null) from per-student reports
  const groupSummaries = reports
    .filter((r) => r.studentId === null)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const studentReports = reports.filter((r) => r.studentId !== null);

  // Map: studentId → sorted (newest first) list
  const byStudent = new Map<string, AiReportRow[]>();
  for (const r of studentReports) {
    const key = r.studentId!;
    if (!byStudent.has(key)) byStudent.set(key, []);
    byStudent.get(key)!.push(r);
  }
  for (const list of byStudent.values()) {
    list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  const studentEntries = Array.from(byStudent.entries());
  const latestSummary = groupSummaries[0];
  const summaryHistory = groupSummaries.slice(1);

  // Resolve which student's reports to show
  const activeStudentReports =
    activeTab === "__group__" ? null : (byStudent.get(activeTab) ?? null);

  const activeStudentName = activeStudentReports?.[0]?.studentName ?? "Unknown";

  return (
    <Box>
      {/* Header row */}
      <Stack direction="row" sx={{ alignItems: "center", mb: 2 }} spacing={2}>
        <Typography variant="h6">AI Analysis</Typography>
        <Chip
          size="small"
          label={`${groupSummaries.length > 0 ? "Group summary" : "No group summary"} · ${byStudent.size} student${byStudent.size !== 1 ? "s" : ""}`}
          variant="outlined"
        />
      </Stack>

      {/* Tab bar: Group Summary + one tab per student */}
      <Tabs
        value={activeTab}
        onChange={(_, v: string) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        <Tab
          value="__group__"
          label="Group Summary"
          icon={<GroupsIcon fontSize="small" />}
          iconPosition="start"
        />
        {studentEntries.map(([studentId, list]) => (
          <Tab
            key={studentId}
            value={studentId}
            label={list[0]?.studentName ?? "Unknown"}
            icon={<PersonIcon fontSize="small" />}
            iconPosition="start"
          />
        ))}
      </Tabs>

      {/* ── Group Summary panel ── */}
      {activeTab === "__group__" && (
        <Box>
          {latestSummary ? (
            <>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <ReportCard
                    report={latestSummary}
                    filename={`report_${safeFilename(groupName)}_${safeFilename(checkpointName)}_group_summary_latest.md`}
                  />
                </CardContent>
              </Card>
              <ReportHistory
                history={summaryHistory}
                groupName={groupName}
                checkpointName={checkpointName}
                subjectLabel="group_summary"
              />
            </>
          ) : (
            <Alert severity="info">
              No group summary generated yet. The AI Report pipeline produces a
              group summary after processing all students.
            </Alert>
          )}
        </Box>
      )}

      {/* ── Per-student panel ── */}
      {activeTab !== "__group__" && activeStudentReports && (
        <Box>
          <Stack
            direction="row"
            sx={{ alignItems: "center", mb: 2 }}
            spacing={1}
          >
            <PersonIcon color="action" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {activeStudentName}
            </Typography>
            <Chip
              size="small"
              label={`${activeStudentReports.length} generation${activeStudentReports.length > 1 ? "s" : ""}`}
              variant="outlined"
            />
          </Stack>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <ReportCard
                report={activeStudentReports[0]!}
                filename={`report_${safeFilename(groupName)}_${safeFilename(checkpointName)}_${safeFilename(activeStudentName)}_latest.md`}
              />
            </CardContent>
          </Card>
          <ReportHistory
            history={activeStudentReports.slice(1)}
            groupName={groupName}
            checkpointName={checkpointName}
            subjectLabel={activeStudentName}
          />
        </Box>
      )}
    </Box>
  );
}
