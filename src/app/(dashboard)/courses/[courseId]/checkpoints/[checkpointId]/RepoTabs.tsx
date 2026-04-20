"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import { AnalysisCharts } from "./AnalysisCharts";

export interface AnalysisRow {
  studentName: string;
  repoId: string;
  repoUrl: string;
  codeMetrics: Record<string, number>;
  testMetrics: Record<string, number>;
}

export interface RepoWarning {
  repoId: string;
  repoUrl: string;
  unidentifiedAuthors: string[];
}

interface Props {
  rows: AnalysisRow[];
  warnings: RepoWarning[];
}

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
    }
  }
  return [...byStudent.values()];
}

function SummaryPanel({
  rows,
  warnings,
}: {
  rows: AnalysisRow[];
  warnings: RepoWarning[];
}) {
  return (
    <>
      {warnings.map((w) => (
        <Alert key={w.repoId} severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Unidentified authors in {shortRepoLabel(w.repoUrl)}</AlertTitle>
          The following git emails are not registered as students:{" "}
          {w.unidentifiedAuthors.join(", ")}
        </Alert>
      ))}

      <AnalysisCharts data={rows} />

      <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ p: 2 }}>
          Summary
        </Typography>
        <Divider />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell align="right">Commits</TableCell>
              <TableCell align="right">Code +/-</TableCell>
              <TableCell align="right">Test +/-</TableCell>
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
                  +{a.codeMetrics.linesAdded ?? 0} / -
                  {a.codeMetrics.linesRemoved ?? 0}
                </TableCell>
                <TableCell align="right">
                  +{a.testMetrics.linesAdded ?? 0} / -
                  {a.testMetrics.linesRemoved ?? 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

export function RepoTabs({ rows, warnings }: Props) {
  const [tab, setTab] = useState<number>(0);

  // Unique repos in the order they appear
  const repos: { id: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!seen.has(row.repoId)) {
      seen.add(row.repoId);
      repos.push({ id: row.repoId, url: row.repoUrl });
    }
  }

  const allRows = aggregateRows(rows);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v as number)}>
        <Tab label="All Repos" />
        {repos.map((repo) => (
          <Tab key={repo.id} label={shortRepoLabel(repo.url)} />
        ))}
      </Tabs>

      <Box sx={{ pt: 2 }}>
        {tab === 0 && <SummaryPanel rows={allRows} warnings={warnings} />}
        {repos.map((repo, i) => {
          const repoRows = rows.filter((r) => r.repoId === repo.id);
          const repoWarnings = warnings.filter((w) => w.repoId === repo.id);
          return tab === i + 1 ? (
            <SummaryPanel key={repo.id} rows={repoRows} warnings={repoWarnings} />
          ) : null;
        })}
      </Box>
    </Box>
  );
}
