"use client";

import { useState } from "react";
import type {
  AnalysisRow,
  RepoWarning,
  ReviewWarning,
} from "@/lib/types/analysis";
export type { AnalysisRow, RepoWarning, ReviewWarning };
import Box from "@mui/material/Box";
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MuiTooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";

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

/* ---------- Collapsible warnings ---------- */

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

/* ---------- Contributions Tab ---------- */

function ContributionsTab({
  rows,
  warnings,
}: {
  rows: AnalysisRow[];
  warnings: RepoWarning[];
}) {
  const theme = useTheme();
  const colorPalette = [
    (theme.vars || theme).palette.primary.dark,
    (theme.vars || theme).palette.primary.main,
    (theme.vars || theme).palette.primary.light,
    (theme.vars || theme).palette.success.main,
  ];

  const names = rows.map((r) => r.studentName);

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

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Contribution Breakdown
          </Typography>
          <BarChart
            borderRadius={6}
            colors={colorPalette}
            xAxis={[
              {
                scaleType: "band",
                data: names,
                categoryGapRatio: 0.4,
                height: 28,
              },
            ]}
            yAxis={[{ width: 48 }]}
            series={[
              {
                id: "code-added",
                label: "Code Added",
                data: rows.map((r) => r.codeMetrics.linesAdded ?? 0),
                stack: "added",
              },
              {
                id: "test-added",
                label: "Test Added",
                data: rows.map((r) => r.testMetrics.linesAdded ?? 0),
                stack: "added",
              },
              {
                id: "code-removed",
                label: "Code Removed",
                data: rows.map((r) => r.codeMetrics.linesRemoved ?? 0),
                stack: "removed",
              },
              {
                id: "test-removed",
                label: "Test Removed",
                data: rows.map((r) => r.testMetrics.linesRemoved ?? 0),
                stack: "removed",
              },
            ]}
            height={300}
            margin={{ left: 0, right: 0, top: 16, bottom: 0 }}
            grid={{ horizontal: true }}
          />
        </CardContent>
      </Card>

      <TableContainer
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
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
  const theme = useTheme();
  const colorPalette = [
    (theme.vars || theme).palette.primary.main,
    (theme.vars || theme).palette.success.main,
  ];

  const sorted = [...rows]
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
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Files Changed per Student
          </Typography>
          <BarChart
            borderRadius={6}
            colors={colorPalette}
            xAxis={[
              {
                scaleType: "band",
                data: sorted.map((d) => d.name),
                categoryGapRatio: 0.4,
                height: 28,
              },
            ]}
            yAxis={[{ width: 48 }]}
            series={[
              {
                id: "code-files",
                label: "Code Files",
                data: sorted.map((d) => d.codeFiles),
              },
              {
                id: "test-files",
                label: "Test Files",
                data: sorted.map((d) => d.testFiles),
              },
            ]}
            height={280}
            margin={{ left: 0, right: 0, top: 16, bottom: 0 }}
            grid={{ horizontal: true }}
          />
        </CardContent>
      </Card>

      <TableContainer
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
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
            {sorted.map((d, i) => (
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
  const theme = useTheme();
  const colorPalette = [
    (theme.vars || theme).palette.primary.dark,
    (theme.vars || theme).palette.primary.main,
    (theme.vars || theme).palette.warning.main,
    (theme.vars || theme).palette.secondary?.main ??
      (theme.vars || theme).palette.primary.light,
    (theme.vars || theme).palette.info.main,
  ];

  const hasData = rows.some((r) => Object.keys(r.reviewMetrics).length > 0);
  const names = rows.map((r) => r.studentName);

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
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                PR Review Activity
              </Typography>
              <BarChart
                borderRadius={6}
                colors={colorPalette}
                xAxis={[
                  {
                    scaleType: "band",
                    data: names,
                    categoryGapRatio: 0.4,
                    height: 28,
                  },
                ]}
                yAxis={[{ width: 48 }]}
                series={[
                  {
                    id: "prs",
                    label: "PRs Reviewed",
                    data: rows.map((r) => r.reviewMetrics.prsReviewed ?? 0),
                  },
                  {
                    id: "approvals",
                    label: "Approvals",
                    data: rows.map((r) => r.reviewMetrics.approvals ?? 0),
                  },
                  {
                    id: "changes",
                    label: "Changes Requested",
                    data: rows.map(
                      (r) => r.reviewMetrics.changesRequested ?? 0
                    ),
                  },
                  {
                    id: "review-comments",
                    label: "Review Comments",
                    data: rows.map((r) => r.reviewMetrics.reviewComments ?? 0),
                  },
                  {
                    id: "issue-comments",
                    label: "Issue Comments",
                    data: rows.map((r) => r.reviewMetrics.issueComments ?? 0),
                  },
                ]}
                height={300}
                margin={{ left: 0, right: 0, top: 16, bottom: 0 }}
                grid={{ horizontal: true }}
              />
            </CardContent>
          </Card>

          <TableContainer
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
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
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          AI Analysis Chat
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          This feature is under development. In the future you will be able to
          ask questions about student contributions and get AI-powered insights.
        </Alert>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            height: 300,
            overflowY: "auto",
            p: 2,
            mb: 2,
            bgcolor: "action.hover",
          }}
        >
          {messages.length === 0 && (
            <Typography color="text.secondary" variant="body2">
              Ask a question about the student contributions…
            </Typography>
          )}
          {messages.map((msg, i) => (
            <Box
              key={i}
              sx={{ mb: 1, textAlign: msg.role === "user" ? "right" : "left" }}
            >
              <Typography
                variant="body2"
                sx={{
                  display: "inline-block",
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  bgcolor:
                    msg.role === "user" ? "primary.main" : "background.paper",
                  color:
                    msg.role === "user"
                      ? "primary.contrastText"
                      : "text.primary",
                  border: "1px solid",
                  borderColor: msg.role === "user" ? "primary.main" : "divider",
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
            placeholder="Ask about contributions…"
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

      {/* Analysis tabs */}
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
