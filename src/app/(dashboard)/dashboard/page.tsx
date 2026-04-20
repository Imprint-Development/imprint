import { auth } from "@/lib/auth";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Box from "@mui/joy/Box";

const stats = [
  { label: "Total Courses", value: "—" },
  { label: "Active Checkpoints", value: "—" },
  { label: "Student Groups", value: "—" },
];

export default async function DashboardPage() {
  const session = await auth();

  return (
    <>
      <Typography level="h2" sx={{ mb: 0.5 }}>
        Welcome back, {session?.user?.name ?? "User"}
      </Typography>
      <Typography level="body-sm" sx={{ mb: 4, color: "text.tertiary" }}>
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
              <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                {stat.label}
              </Typography>
              <Typography level="h2" sx={{ mt: 1 }}>
                {stat.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </>
  );
}
