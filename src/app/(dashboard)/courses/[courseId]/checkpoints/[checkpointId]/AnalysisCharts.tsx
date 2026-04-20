"use client";

import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Typography from "@mui/joy/Typography";
import Sheet from "@mui/joy/Sheet";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface AnalysisEntry {
  studentName: string;
  repoId?: string;
  codeMetrics: Record<string, number>;
  testMetrics: Record<string, number>;
}

export function AnalysisCharts({ data }: { data: AnalysisEntry[] }) {
  const barData = data.map((d) => ({
    name: d.studentName,
    Code: d.codeMetrics.linesAdded ?? 0,
    Test: d.testMetrics.linesAdded ?? 0,
  }));

  return (
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
            </BarChart>
          </ResponsiveContainer>
        </Sheet>
      </CardContent>
    </Card>
  );
}
