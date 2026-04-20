"use client";

import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Sheet from "@mui/joy/Sheet";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
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
          bgcolor: "primary.800",
          color: "common.white",
          background:
            "linear-gradient(135deg, var(--joy-palette-primary-800) 0%, var(--joy-palette-primary-700) 100%)",
        }}
      >
        <Typography
          level="h1"
          sx={{ color: "inherit", fontSize: "2.5rem", mb: 1 }}
        >
          Imprint
        </Typography>
        <Typography level="body-lg" sx={{ color: "primary.200", mb: 5 }}>
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
              <Box sx={{ color: "primary.300", mt: 0.5 }}>{item.icon}</Box>
              <Box>
                <Typography
                  level="title-md"
                  sx={{ color: "inherit", mb: 0.25 }}
                >
                  {item.title}
                </Typography>
                <Typography level="body-sm" sx={{ color: "primary.300" }}>
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
        <Sheet
          variant="outlined"
          sx={{
            width: "100%",
            maxWidth: 400,
            p: 4,
            borderRadius: "md",
            boxShadow: "sm",
          }}
        >
          <Typography level="h3" sx={{ mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography level="body-sm" sx={{ mb: 3, color: "neutral.500" }}>
            Sign in to your account
          </Typography>

          <form action={signInWithGitHub}>
            <Button
              type="submit"
              variant="solid"
              color="neutral"
              fullWidth
              startDecorator={<GitHubIcon />}
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
                    <Input
                      name="username"
                      type="text"
                      defaultValue="admin"
                      required
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Password</FormLabel>
                    <Input
                      name="password"
                      type="password"
                      defaultValue="admin"
                      required
                    />
                  </FormControl>
                  <Button
                    type="submit"
                    variant="soft"
                    color="neutral"
                    fullWidth
                  >
                    Sign in as Local Admin
                  </Button>
                </Stack>
              </form>
            </>
          )}
        </Sheet>
      </Box>
    </Box>
  );
}
