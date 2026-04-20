import AppLink from "@/components/AppLink";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createCourse } from "@/lib/actions/courses";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Link from "@mui/joy/Link";
import HomeRounded from "@mui/icons-material/HomeRounded";

export default async function NewCoursePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          <HomeRounded />
        </AppLink>
        <AppLink href="/courses">Courses</AppLink>
        <Typography>New</Typography>
      </Breadcrumbs>

      <Typography level="h2" sx={{ mb: 3 }}>
        Create Course
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <form action={createCourse}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Course Name</FormLabel>
                <Input name="name" placeholder="e.g. Software Engineering" />
              </FormControl>
              <FormControl required>
                <FormLabel>Semester</FormLabel>
                <Input name="semester" placeholder="e.g. WS2025" />
              </FormControl>
              <Button type="submit">Create Course</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
