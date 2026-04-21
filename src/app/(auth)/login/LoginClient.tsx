"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import GitHubIcon from "@mui/icons-material/GitHub";
import CodeIcon from "@mui/icons-material/Code";
import RateReviewIcon from "@mui/icons-material/RateReview";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

interface LoginClientProps {
  signInWithGitHub: () => Promise<void>;
  signInWithCredentials: (formData: FormData) => Promise<void>;
  showDevLogin: boolean;
}

export default function LoginClient({
  signInWithGitHub,
  signInWithCredentials,
  showDevLogin,
}: LoginClientProps) {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
      }}
    >
      {/* Left branding panel */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          px: 6,
          py: 4,
          bgcolor: "primary.dark",
          color: "common.white",
          background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
        }}
      >
        <Typography variant="h3" sx={{ color: "inherit", mb: 1 }}>
          Imprint
        </Typography>
        <Typography variant="body1" sx={{ color: "primary.100", mb: 5 }}>
          Analyze student contributions in Software Engineering courses
        </Typography>

        <Stack spacing={3}>
          {[
            {
              icon: <CodeIcon />,
              title: "Code & Testing",
              desc: "Track commits, lines of code, and test coverage per student.",
            },
            {
              icon: <RateReviewIcon />,
              title: "Code Review",
              desc: "Measure review activity, comments, and approval patterns.",
            },
            {
              icon: <AccountTreeIcon />,
              title: "Process Work",
              desc: "Monitor issue tracking, branch workflows, and CI/CD usage.",
            },
          ].map((item) => (
            <Box key={item.title} sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ color: "primary.200", mt: 0.5 }}>{item.icon}</Box>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ color: "inherit", mb: 0.25 }}
                >
                  {item.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "primary.200" }}>
                  {item.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Right sign-in panel */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            width: "100%",
            maxWidth: 400,
            p: 4,
            borderRadius: 2,
          }}
        >
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
            Sign in to your account
          </Typography>

          <form action={signInWithGitHub}>
            <Button
              type="submit"
              variant="contained"
              color="inherit"
              fullWidth
              startIcon={<GitHubIcon />}
              sx={{ mb: 2 }}
            >
              Sign in with GitHub
            </Button>
          </form>

          {showDevLogin && (
            <>
              <Divider sx={{ my: 2 }}>DEV ONLY</Divider>
              <form action={signInWithCredentials}>
                <Stack spacing={1.5}>
                  <FormControl>
                    <FormLabel>Username</FormLabel>
                    <TextField
                      name="username"
                      type="text"
                      defaultValue="admin"
                      required
                      size="small"
                      fullWidth
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Password</FormLabel>
                    <TextField
                      name="password"
                      type="password"
                      defaultValue="admin"
                      required
                      size="small"
                      fullWidth
                    />
                  </FormControl>
                  <Button
                    type="submit"
                    variant="outlined"
                    color="inherit"
                    fullWidth
                  >
                    Sign in as Local Admin
                  </Button>
                </Stack>
              </form>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
