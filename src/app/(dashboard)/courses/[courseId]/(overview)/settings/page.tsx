import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import {
  updateCourse,
  deleteCourse,
  addIgnoredGitEmail,
  removeIgnoredGitEmail,
  addIgnoredGithubUsername,
  removeIgnoredGithubUsername,
} from "@/lib/actions/courses";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import DeleteRounded from "@mui/icons-material/DeleteRounded";

export default async function SettingsTabPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) redirect("/courses");

  const updateCourseWithId = updateCourse.bind(null, courseId);
  const deleteCourseWithId = deleteCourse.bind(null, courseId);
  const addIgnoredEmailWithId = addIgnoredGitEmail.bind(null, courseId);
  const addIgnoredGithubUsernameWithId = addIgnoredGithubUsername.bind(
    null,
    courseId
  );

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Course Details
          </Typography>
          <form action={updateCourseWithId}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Course Name</FormLabel>
                <TextField
                  name="name"
                  defaultValue={course.name}
                  size="small"
                  fullWidth
                />
              </FormControl>
              <FormControl required>
                <FormLabel>Semester</FormLabel>
                <TextField
                  name="semester"
                  defaultValue={course.semester}
                  size="small"
                  fullWidth
                />
              </FormControl>
              <Button
                type="submit"
                variant="contained"
                sx={{ alignSelf: "flex-start" }}
              >
                Save Changes
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Ignored Git Emails
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Commits from these git identities will not appear as unidentified
            author warnings.
          </Typography>
          {course.ignoredGitEmails.length > 0 && (
            <Stack direction="row" sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
              {course.ignoredGitEmails.map((email) => (
                <form
                  key={email}
                  action={removeIgnoredGitEmail.bind(null, courseId, email)}
                >
                  <Chip
                    size="small"
                    label={email}
                    onDelete={undefined}
                    deleteIcon={
                      <IconButton
                        type="submit"
                        size="small"
                        sx={{ borderRadius: "50%", p: 0 }}
                      >
                        <DeleteRounded fontSize="small" />
                      </IconButton>
                    }
                    variant="outlined"
                  />
                </form>
              ))}
            </Stack>
          )}
          <Divider sx={{ my: 2 }} />
          <form action={addIgnoredEmailWithId}>
            <Stack direction="row" spacing={1}>
              <TextField
                name="ignoredEmail"
                placeholder="git-email@example.com"
                type="email"
                size="small"
                sx={{ flex: 1 }}
              />
              <Button type="submit" size="small" variant="outlined">
                Add
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Ignored GitHub Usernames
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Pull request activity from these GitHub accounts will be silently
            ignored during analysis (e.g. bots, CI users).
          </Typography>
          {course.ignoredGithubUsernames.length > 0 && (
            <Stack direction="row" sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
              {course.ignoredGithubUsernames.map((username) => (
                <form
                  key={username}
                  action={removeIgnoredGithubUsername.bind(
                    null,
                    courseId,
                    username
                  )}
                >
                  <Chip
                    size="small"
                    label={username}
                    onDelete={undefined}
                    deleteIcon={
                      <IconButton
                        type="submit"
                        size="small"
                        sx={{ borderRadius: "50%", p: 0 }}
                      >
                        <DeleteRounded fontSize="small" />
                      </IconButton>
                    }
                    variant="outlined"
                    sx={{ fontFamily: "monospace" }}
                  />
                </form>
              ))}
            </Stack>
          )}
          <Divider sx={{ my: 2 }} />
          <form action={addIgnoredGithubUsernameWithId}>
            <Stack direction="row" spacing={1}>
              <TextField
                name="ignoredGithubUsername"
                placeholder="github-login"
                size="small"
                sx={{ flex: 1 }}
                slotProps={{
                  input: { sx: { fontFamily: "monospace" } },
                }}
              />
              <Button type="submit" size="small" variant="outlined">
                Add
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderColor: "error.main" }}>
        <CardContent>
          <Typography variant="h6" color="error" sx={{ mb: 1 }}>
            Danger Zone
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Deleting a course is permanent and cannot be undone.
          </Typography>
          <ConfirmDeleteButton
            title="Delete Course"
            description={`Are you sure you want to delete "${course.name}"? This action cannot be undone.`}
            action={deleteCourseWithId}
            buttonLabel="Delete Course"
          />
        </CardContent>
      </Card>
    </Box>
  );
}
