"use client";

import * as React from "react";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { useRouter } from "next/navigation";

interface UserActionButtonsProps {
  userId: string;
  currentStatus: string | null;
}

export default function UserActionButtons({
  userId,
  currentStatus,
}: UserActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function updateStatus(status: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error ?? "Failed to update user status."
        );
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ButtonGroup size="small" disabled={loading}>
        {currentStatus !== "active" && (
          <Button
            color="success"
            variant="outlined"
            onClick={() => updateStatus("active")}
          >
            Unlock
          </Button>
        )}
        {currentStatus !== "locked" && currentStatus !== "banned" && (
          <Button
            color="warning"
            variant="outlined"
            onClick={() => updateStatus("locked")}
          >
            Lock
          </Button>
        )}
        {currentStatus !== "banned" && (
          <Button
            color="error"
            variant="outlined"
            onClick={() => updateStatus("banned")}
          >
            Ban
          </Button>
        )}
      </ButtonGroup>
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
