"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DownloadIcon from "@mui/icons-material/Download";
import ReactMarkdown from "react-markdown";

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
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}
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

function StudentReportGroup({
  studentName,
  reports,
  groupName,
  checkpointName,
}: {
  studentName: string;
  reports: AiReportRow[];
  groupName: string;
  checkpointName: string;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const latest = reports[0]!;
  const history = reports.slice(1);
  const safeFilename = (s: string) => s.replace(/[^a-z0-9_-]/gi, "_");

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardHeader
        title={
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {studentName}
          </Typography>
        }
        subheader={`${history.length + 1} generation${reports.length > 1 ? "s" : ""}`}
        sx={{ pb: 0 }}
      />
      <CardContent>
        <ReportCard
          report={latest}
          filename={`report_${safeFilename(groupName)}_${safeFilename(checkpointName)}_${safeFilename(studentName)}_latest.md`}
        />
        {history.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory
                ? "Hide older versions"
                : `Show ${history.length} older version${history.length > 1 ? "s" : ""}`}
            </Button>
            {showHistory &&
              history.map((r, i) => (
                <Box key={r.id} sx={{ mt: 1 }}>
                  <ReportCard
                    report={r}
                    filename={`report_${safeFilename(groupName)}_${safeFilename(checkpointName)}_${safeFilename(studentName)}_v${history.length - i}.md`}
                  />
                </Box>
              ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function AiReportsSection({
  reports,
  checkpointName,
  groupName,
}: Props) {
  // Hooks must be called unconditionally before any early return
  const [showSummaryHistory, setShowSummaryHistory] = useState(false);

  if (reports.length === 0) {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          AI Reports
        </Typography>
        <Alert severity="info">
          No AI reports generated yet. Enable the <strong>AI Report</strong>{" "}
          pipeline on this checkpoint and re-run analysis.
        </Alert>
      </Box>
    );
  }

  const safeFilename = (s: string) => s.replace(/[^a-z0-9_-]/gi, "_");

  // Separate group summaries (studentId = null) from per-student reports
  const groupSummaries = reports
    .filter((r) => r.studentId === null)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const studentReports = reports.filter((r) => r.studentId !== null);

  // Group per-student reports by studentId, sorted newest-first
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

  const latestSummary = groupSummaries[0];
  const summaryHistory = groupSummaries.slice(1);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        AI Reports
      </Typography>

      {/* Group summary */}
      {latestSummary && (
        <Accordion defaultExpanded variant="outlined" sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Group Summary
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ReportCard
              report={latestSummary}
              filename={`report_${safeFilename(groupName)}_${safeFilename(checkpointName)}_group_summary_latest.md`}
            />
            {summaryHistory.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setShowSummaryHistory((v) => !v)}
                >
                  {showSummaryHistory
                    ? "Hide older versions"
                    : `Show ${summaryHistory.length} older version${summaryHistory.length > 1 ? "s" : ""}`}
                </Button>
                {showSummaryHistory &&
                  summaryHistory.map((r, i) => (
                    <Box key={r.id} sx={{ mt: 1 }}>
                      <ReportCard
                        report={r}
                        filename={`report_${safeFilename(groupName)}_${safeFilename(checkpointName)}_group_summary_v${summaryHistory.length - i}.md`}
                      />
                    </Box>
                  ))}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Per-student reports */}
      {byStudent.size > 0 && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
            Student Reports
          </Typography>
          {Array.from(byStudent.entries()).map(([, studentReportList]) => {
            const name = studentReportList[0]?.studentName ?? "Unknown Student";
            return (
              <StudentReportGroup
                key={studentReportList[0]?.studentId}
                studentName={name}
                reports={studentReportList}
                groupName={groupName}
                checkpointName={checkpointName}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}
