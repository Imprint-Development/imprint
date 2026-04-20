"use client";

import { useState } from "react";
import Box from "@mui/joy/Box";
import Sheet from "@mui/joy/Sheet";
import Tabs from "@mui/joy/Tabs";
import TabList from "@mui/joy/TabList";
import Tab from "@mui/joy/Tab";
import TabPanel from "@mui/joy/TabPanel";
import Typography from "@mui/joy/Typography";
import Divider from "@mui/joy/Divider";
import Table from "@mui/joy/Table";
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
        <Sheet
          key={w.repoId}
          variant="soft"
          color="warning"
          sx={{ p: 2, borderRadius: "sm", mb: 2 }}
        >
          <Typography level="title-sm" sx={{ mb: 0.5 }}>
            Unidentified authors in {shortRepoLabel(w.repoUrl)}
          </Typography>
          <Typography level="body-sm">
            The following git emails are not registered as students:{" "}
            {w.unidentifiedAuthors.join(", ")}
          </Typography>
        </Sheet>
      ))}

      <AnalysisCharts data={rows} />

      <Sheet variant="outlined" sx={{ borderRadius: "sm", mt: 3 }}>
        <Typography level="title-lg" sx={{ p: 2 }}>
          Summary
        </Typography>
        <Divider />
        <Table>
          <thead>
            <tr>
              <th>Student</th>
              <th style={{ textAlign: "right" }}>Commits</th>
              <th style={{ textAlign: "right" }}>Code +/-</th>
              <th style={{ textAlign: "right" }}>Test +/-</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={i}>
                <td>{a.studentName}</td>
                <td style={{ textAlign: "right" }}>
                  {a.codeMetrics.commits ?? 0}
                </td>
                <td style={{ textAlign: "right" }}>
                  +{a.codeMetrics.linesAdded ?? 0} / -
                  {a.codeMetrics.linesRemoved ?? 0}
                </td>
                <td style={{ textAlign: "right" }}>
                  +{a.testMetrics.linesAdded ?? 0} / -
                  {a.testMetrics.linesRemoved ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>
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
        <TabList>
          <Tab>All Repos</Tab>
          {repos.map((repo) => (
            <Tab key={repo.id}>{shortRepoLabel(repo.url)}</Tab>
          ))}
        </TabList>

        <TabPanel value={0}>
          <SummaryPanel rows={allRows} warnings={warnings} />
        </TabPanel>

        {repos.map((repo, i) => {
          const repoRows = rows.filter((r) => r.repoId === repo.id);
          const repoWarnings = warnings.filter((w) => w.repoId === repo.id);
          return (
            <TabPanel key={repo.id} value={i + 1}>
              <SummaryPanel rows={repoRows} warnings={repoWarnings} />
            </TabPanel>
          );
        })}
      </Tabs>
    </Box>
  );
}
