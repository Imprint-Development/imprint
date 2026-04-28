"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MuiTooltip from "@mui/material/Tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface AnalysisRow {
  studentName: string;
  repoId: string;
  repoUrl: string;
  codeMetrics: Record<string, number>;
  testMetrics: Record<string, number>;
  reviewMetrics: Record<string, number>;
}

export interface RepoWarning {
  repoId: string;
  repoUrl: string;
  unidentifiedAuthors: string[];
}

export interface ReviewWarning {
  repoId: string;
  repoUrl: string;
  message: string;
}

interface Props {
  rows: AnalysisRow[];
  warnings: RepoWarning[];
  reviewWarnings: ReviewWarning[];
  executedPipelines: string[];
}

interface TabConfig {
  label: string;
  requiredPipeline: string | null;
}

const TABS: TabConfig[] = [
  { label: "Contributions", requiredPipeline: "contributions" },
  { label: "Files", requiredPipeline: "contributions" },
  { label: "Review", requiredPipeline: "review" },
  { label: "AI Chat", requiredPipeline: null },
];

function shortRepoLabel(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, "").replace(/\.git$/, "");
  } catch {
    return url;
  }
}

function aggregateRows(rows: AnalysisRow[]): AnalysisRow[] {
  const byStudent = new Map<string, AnalysisRow>();
  for (const row of rows) {
    const existing = byStudent.get(row.studentName);
    if (!existing) {
      byStudent.set(row.studentName, {
        studentName: row.studentName,
        repoId: "all",
        repoUrl: "all",
        codeMetrics: { ...row.codeMetrics },
        testMetrics: { ...row.testMetrics },
        reviewMetrics: { ...row.reviewMetrics },
      });
    } else {
      for (const key of Object.keys(row.codeMetrics)) {
        existing.codeMetrics[key] =
          (existing.codeMetrics[key] ?? 0) + (row.codeMetrics[key] ?? 0);
      }
      for (const key of Object.keys(row.testMetrics)) {
        existing.testMetrics[key] =
          (existing.testMetrics[key] ?? 0) + (row.testMetrics[key] ?? 0);
      }
      for (const key of Object.keys(row.reviewMetrics)) {
        existing.reviewMetrics[key] =
          (existing.reviewMetrics[key] ?? 0) + (row.reviewMetrics[key] ?? 0);
      }
    }
  }
  return [...byStudent.values()];
}

function getUniqueRepos(rows: AnalysisRow[]): { id: string; url: string }[] {
  const repos: { id: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!seen.has(row.repoId)) {
      seen.add(row.repoId);
      repos.push({ id: row.repoId, url: row.repoUrl });
    }
  }
  return repos;
}

/* ---------- Contributions Tab ---------- */

function CollapsibleWarnings({
  children,
  count,
}: {
  children: React.ReactNode;
  count: number;
}) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Button
        size="small"
        color="warning"
        startIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        onClick={() => setOpen((v) => !v)}
        sx={{ mb: 0.5 }}
      >
        {count} warning{count !== 1 ? "s" : ""}
      </Button>
      <Collapse in={open}>
        <Stack spacing={1}>{children}</Stack>
      </Collapse>
    </Box>
  );
}

function ContributionsTab({
  rows,
  warnings,
}: {
  rows: AnalysisRow[];
  warnings: RepoWarning[];
}) {
  const barData = rows.map((d) => ({
    name: d.studentName,
    "Code Added": d.codeMetrics.linesAdded ?? 0,
    "Code Removed": d.codeMetrics.linesRemoved ?? 0,
    "Test Added": d.testMetrics.linesAdded ?? 0,
    "Test Removed": d.testMetrics.linesRemoved ?? 0,
  }));

  return (
    <>
      <CollapsibleWarnings count={warnings.length}>
        {warnings.map((w) => (
          <Alert key={w.repoId} severity="warning">
            <AlertTitle>
              Unidentified authors in {shortRepoLabel(w.repoUrl)}
            </AlertTitle>
            The following git emails are not registered as students:{" "}
            {w.unidentifiedAuthors.join(", ")}
          </Alert>
        ))}
      </CollapsibleWarnings>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Contribution Breakdown
          </Typography>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Code Added" stackId="added" fill="#1976d2" />
              <Bar dataKey="Test Added" stackId="added" fill="#388e3c" />
              <Bar dataKey="Code Removed" stackId="removed" fill="#90caf9" />
              <Bar dataKey="Test Removed" stackId="removed" fill="#a5d6a7" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell align="right">Commits</TableCell>
              <TableCell align="right">Code Added</TableCell>
              <TableCell align="right">Code Removed</TableCell>
              <TableCell align="right">Test Added</TableCell>
              <TableCell align="right">Test Removed</TableCell>
              <TableCell align="right">Files Changed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((a, i) => (
              <TableRow key={i}>
                <TableCell>{a.studentName}</TableCell>
                <TableCell align="right">
                  {a.codeMetrics.commits ?? 0}
                </TableCell>
                <TableCell align="right">
                  {a.codeMetrics.linesAdded ?? 0}
                </TableCell>
                <TableCell align="right">
                  {a.codeMetrics.linesRemoved ?? 0}
                </TableCell>
                <TableCell align="right">
                  {a.testMetrics.linesAdded ?? 0}
                </TableCell>
                <TableCell align="right">
                  {a.testMetrics.linesRemoved ?? 0}
                </TableCell>
                <TableCell align="right">
                  {(a.codeMetrics.filesChanged ?? 0) +
                    (a.testMetrics.filesChanged ?? 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

/* ---------- Files Tab ---------- */

function FilesTab({ rows }: { rows: AnalysisRow[] }) {
  const fileData = rows
    .map((d) => ({
      name: d.studentName,
      codeFiles: d.codeMetrics.filesChanged ?? 0,
      testFiles: d.testMetrics.filesChanged ?? 0,
      total:
        (d.codeMetrics.filesChanged ?? 0) + (d.testMetrics.filesChanged ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Files Changed per Student
          </Typography>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={fileData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="codeFiles" name="Code Files" fill="#1976d2" />
              <Bar dataKey="testFiles" name="Test Files" fill="#388e3c" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell align="right">Code Files</TableCell>
              <TableCell align="right">Test Files</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fileData.map((d, i) => (
              <TableRow key={i}>
                <TableCell>{d.name}</TableCell>
                <TableCell align="right">{d.codeFiles}</TableCell>
                <TableCell align="right">{d.testFiles}</TableCell>
                <TableCell align="right">{d.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" sx={{ mt: 2 }}>
        Per-file breakdown (individual file paths) will be available in a future
        update.
      </Alert>
    </>
  );
}

/* ---------- Review Tab ---------- */

function ReviewTab({
  rows,
  reviewWarnings,
}: {
  rows: AnalysisRow[];
  reviewWarnings: ReviewWarning[];
}) {
  const hasData = rows.some((r) => Object.keys(r.reviewMetrics).length > 0);

  const barData = rows.map((d) => ({
    name: d.studentName,
    "PRs Reviewed": d.reviewMetrics.prsReviewed ?? 0,
    Approvals: d.reviewMetrics.approvals ?? 0,
    "Changes Requested": d.reviewMetrics.changesRequested ?? 0,
    "Review Comments": d.reviewMetrics.reviewComments ?? 0,
    "Issue Comments": d.reviewMetrics.issueComments ?? 0,
  }));

  return (
    <>
      <CollapsibleWarnings count={reviewWarnings.length}>
        {reviewWarnings.map((w, i) => (
          <Alert key={i} severity="warning">
            <AlertTitle>
              Unmatched GitHub users in {shortRepoLabel(w.repoUrl)}
            </AlertTitle>
            {w.message}
          </Alert>
        ))}
      </CollapsibleWarnings>

      {!hasData ? (
        <Alert severity="info">
          No review data available. Run the <strong>review</strong> pipeline to
          see PR review activity.
        </Alert>
      ) : (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                PR Review Activity
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="PRs Reviewed" fill="#1976d2" />
                  <Bar dataKey="Approvals" fill="#388e3c" />
                  <Bar dataKey="Changes Requested" fill="#f57c00" />
                  <Bar dataKey="Review Comments" fill="#7b1fa2" />
                  <Bar dataKey="Issue Comments" fill="#0097a7" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell align="right">PRs Reviewed</TableCell>
                  <TableCell align="right">Approvals</TableCell>
                  <TableCell align="right">Changes Requested</TableCell>
                  <TableCell align="right">Review Comments</TableCell>
                  <TableCell align="right">Issue Comments</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{a.studentName}</TableCell>
                    <TableCell align="right">
                      {a.reviewMetrics.prsReviewed ?? 0}
                    </TableCell>
                    <TableCell align="right">
                      {a.reviewMetrics.approvals ?? 0}
                    </TableCell>
                    <TableCell align="right">
                      {a.reviewMetrics.changesRequested ?? 0}
                    </TableCell>
                    <TableCell align="right">
                      {a.reviewMetrics.reviewComments ?? 0}
                    </TableCell>
                    <TableCell align="right">
                      {a.reviewMetrics.issueComments ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </>
  );
}

/* ---------- AI Chat Tab ---------- */

function AiChatTab() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: input },
      {
        role: "assistant",
        text: "AI analysis is not yet connected. This is a placeholder for future AI-powered contribution insights.",
      },
    ]);
    setInput("");
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          AI Analysis Chat
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          This feature is under development. In the future you will be able to
          ask questions about student contributions and get AI-powered insights.
        </Alert>
        <Box
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            height: 300,
            overflowY: "auto",
            p: 2,
            mb: 2,
            bgcolor: "grey.50",
          }}
        >
          {messages.length === 0 && (
            <Typography color="text.secondary" variant="body2">
              Ask a question about the student contributions...
            </Typography>
          )}
          {messages.map((msg, i) => (
            <Box
              key={i}
              sx={{
                mb: 1,
                textAlign: msg.role === "user" ? "right" : "left",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  display: "inline-block",
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  bgcolor: msg.role === "user" ? "primary.main" : "grey.200",
                  color: msg.role === "user" ? "white" : "text.primary",
                }}
              >
                {msg.text}
              </Typography>
            </Box>
          ))}
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            fullWidth
            placeholder="Ask about contributions..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button variant="contained" onClick={handleSend}>
            Send
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

/* ---------- Main Component ---------- */

export function GroupAnalysisClient({
  rows,
  warnings,
  reviewWarnings,
  executedPipelines,
}: Props) {
  const repos = getUniqueRepos(rows);
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [tab, setTab] = useState(0);

  const filteredRows =
    selectedRepo === "all"
      ? aggregateRows(rows)
      : rows.filter((r) => r.repoId === selectedRepo);

  const filteredWarnings =
    selectedRepo === "all"
      ? warnings
      : warnings.filter((w) => w.repoId === selectedRepo);

  const filteredReviewWarnings =
    selectedRepo === "all"
      ? reviewWarnings
      : reviewWarnings.filter((w) => w.repoId === selectedRepo);

  return (
    <Box>
      {/* Repo selector */}
      <FormControl size="small" sx={{ minWidth: 300, mb: 3 }}>
        <InputLabel>Repository</InputLabel>
        <Select
          value={selectedRepo}
          label="Repository"
          onChange={(e) => setSelectedRepo(e.target.value)}
        >
          <MenuItem value="all">All Repositories</MenuItem>
          {repos.map((repo) => (
            <MenuItem key={repo.id} value={repo.id}>
              {shortRepoLabel(repo.url)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as number)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        {TABS.map((t, i) => {
          const pipelineRan =
            t.requiredPipeline === null ||
            executedPipelines.includes(t.requiredPipeline);
          const tabEl = <Tab key={i} label={t.label} disabled={!pipelineRan} />;
          return pipelineRan ? (
            tabEl
          ) : (
            <MuiTooltip
              key={i}
              title={`Run the "${t.requiredPipeline}" pipeline to enable this tab`}
            >
              {/* Tooltip requires a non-disabled wrapper to receive pointer events */}
              <span>{tabEl}</span>
            </MuiTooltip>
          );
        })}
      </Tabs>

      {tab === 0 && (
        <ContributionsTab rows={filteredRows} warnings={filteredWarnings} />
      )}
      {tab === 1 && <FilesTab rows={filteredRows} />}
      {tab === 2 && (
        <ReviewTab
          rows={filteredRows}
          reviewWarnings={filteredReviewWarnings}
        />
      )}
      {tab === 3 && <AiChatTab />}
    </Box>
  );
}
