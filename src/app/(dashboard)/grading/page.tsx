import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";

export default function GradingIndexPage() {
  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs items={[{ label: "Grading" }]} />

      <Typography variant="h5" sx={{ mb: 3 }}>
        Grading
      </Typography>

      <Alert severity="info">
        Select a course from the sidebar to view its grades.
      </Alert>
    </Box>
  );
}
