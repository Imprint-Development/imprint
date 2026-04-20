import AppLink from "@/components/AppLink";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createCourse } from "@/lib/actions/courses";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import TextField from "@mui/material/TextField";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import HomeRounded from "@mui/icons-material/HomeRounded";

export default async function NewCoursePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          <HomeRounded fontSize="small" />
        </AppLink>
        <AppLink href="/courses">Courses</AppLink>
        <Typography>New</Typography>
      </Breadcrumbs>

      <Typography variant="h5" sx={{ mb: 3 }}>
        Create Course
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <form action={createCourse}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Course Name</FormLabel>
                <TextField
                  name="name"
                  placeholder="e.g. Software Engineering"
                  size="small"
                  fullWidth
                />
              </FormControl>
              <FormControl required>
                <FormLabel>Semester</FormLabel>
                <TextField
                  name="semester"
                  placeholder="e.g. WS2025"
                  size="small"
                  fullWidth
                />
              </FormControl>
              <Button type="submit" variant="contained">
                Create Course
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
