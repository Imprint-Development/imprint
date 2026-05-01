"use client";

import * as React from "react";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
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

  async function updateStatus(status: string) {
    setLoading(true);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
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
  );
}
