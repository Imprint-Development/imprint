"use client";

import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Typography from "@mui/joy/Typography";
import Sheet from "@mui/joy/Sheet";
import Box from "@mui/joy/Box";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface AnalysisEntry {
  studentName: string;
  codeMetrics: Record<string, number>;
  testMetrics: Record<string, number>;
  docMetrics: Record<string, number>;
  cicdMetrics: Record<string, number>;
}

export function AnalysisCharts({ data }: { data: AnalysisEntry[] }) {
  const barData = data.map((d) => ({
    name: d.studentName,
    Code: d.codeMetrics.linesAdded ?? 0,
    Test: d.testMetrics.linesAdded ?? 0,
    Docs: d.docMetrics.linesAdded ?? 0,
    "CI/CD": d.cicdMetrics.linesAdded ?? 0,
  }));

  const radarStudents = data.map((d) => ({
    name: d.studentName,
    commits: d.codeMetrics.commits ?? 0,
    linesAdded: d.codeMetrics.linesAdded ?? 0,
    testLines: d.testMetrics.linesAdded ?? 0,
    docLines: d.docMetrics.linesAdded ?? 0,
  }));

  const radarMetrics = ["commits", "linesAdded", "testLines", "docLines"];
  const radarData = radarMetrics.map((metric) => {
    const entry: Record<string, string | number> = { metric };
    for (const s of radarStudents) {
      entry[s.name] = s[metric as keyof typeof s] as number;
    }
    return entry;
  });

  const colors = ["#1976d2", "#388e3c", "#f57c00", "#7b1fa2", "#c62828"];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 3,
      }}
    >
      <Card>
        <CardContent>
          <Typography level="title-lg" sx={{ mb: 2 }}>
            Contribution Breakdown
          </Typography>
          <Sheet sx={{ p: 1 }}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={barData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Code" stackId="a" fill="#1976d2" />
                <Bar dataKey="Test" stackId="a" fill="#388e3c" />
                <Bar dataKey="Docs" stackId="a" fill="#f57c00" />
                <Bar dataKey="CI/CD" stackId="a" fill="#7b1fa2" />
              </BarChart>
            </ResponsiveContainer>
          </Sheet>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography level="title-lg" sx={{ mb: 2 }}>
            Student Impact Radar
          </Typography>
          <Sheet sx={{ p: 1 }}>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis />
                {radarStudents.map((s, i) => (
                  <Radar
                    key={s.name}
                    name={s.name}
                    dataKey={s.name}
                    stroke={colors[i % colors.length]}
                    fill={colors[i % colors.length]}
                    fillOpacity={0.15}
                  />
                ))}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Sheet>
        </CardContent>
      </Card>
    </Box>
  );
}
