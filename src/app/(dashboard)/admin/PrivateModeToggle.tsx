"use client";

import * as React from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { useRouter } from "next/navigation";

interface PrivateModeToggleProps {
  initialEnabled: boolean;
}

export default function PrivateModeToggle({
  initialEnabled,
}: PrivateModeToggleProps) {
  const router = useRouter();
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleToggle(checked: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privateModeEnabled: checked }),
      });
      if (!res.ok) {
        setError("Failed to update setting. Please try again.");
        return;
      }
      setEnabled(checked);
      router.refresh();
    } catch {
      setError("Failed to update setting. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Private mode
            </Typography>
            <Typography variant="body2" color="text.secondary">
              When enabled, new users who sign in will be automatically locked
              and cannot access the dashboard until an administrator unlocks
              them. Existing active users are not affected.
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => handleToggle(e.target.checked)}
                disabled={loading}
              />
            }
            label={enabled ? "On" : "Off"}
            labelPlacement="start"
            sx={{ mr: 0 }}
          />
        </Box>
        {enabled && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Private mode is active. New sign-ins will be locked pending admin
            approval.
          </Alert>
        )}
      </Paper>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
