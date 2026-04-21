"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
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
        <Typography variant="h6" sx={{ mb: 2 }}>
          Contribution Breakdown
        </Typography>
        <Box sx={{ p: 1 }}>
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
        </Box>
      </CardContent>
    </Card>
  );
}
