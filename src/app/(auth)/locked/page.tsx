import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

export default async function LockedPage() {
  const session = await auth();

  if (!session) redirect("/login");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        bgcolor: "background.default",
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 440,
          p: 4,
          borderRadius: 2,
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 48, color: "text.secondary" }} />
          <Typography variant="h5">Account pending approval</Typography>
          <Typography variant="body2" color="text.secondary">
            This instance is in private mode. Your account has been created, but
            an administrator must unlock it before you can access the dashboard.
            Please contact your administrator.
          </Typography>
          <form action={signOutAction} style={{ width: "100%" }}>
            <Button type="submit" variant="outlined" fullWidth>
              Sign out
            </Button>
          </form>
        </Box>
      </Paper>
    </Box>
  );
}
