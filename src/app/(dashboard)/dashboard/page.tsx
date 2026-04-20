import { auth } from "@/lib/auth";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";

const stats = [
  { label: "Total Courses", value: "—" },
  { label: "Active Checkpoints", value: "—" },
  { label: "Student Groups", value: "—" },
];

export default async function DashboardPage() {
  const session = await auth();

  return (
    <>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Welcome back, {session?.user?.name ?? "User"}
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: "text.secondary" }}>
        Here&apos;s an overview of your workspace.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, 1fr)",
          },
          gap: 2,
        }}
      >
        {stats.map((stat) => (
          <Card key={stat.label} variant="outlined">
            <CardContent>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {stat.label}
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                {stat.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </>
  );
}
