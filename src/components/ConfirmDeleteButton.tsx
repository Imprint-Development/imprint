"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import WarningRounded from "@mui/icons-material/WarningRounded";
import { useState } from "react";

interface ConfirmDeleteButtonProps {
  title: string;
  description: string;
  action: () => Promise<void> | void;
  buttonLabel?: string;
}

export default function ConfirmDeleteButton({
  title,
  description,
  action,
  buttonLabel = "Delete",
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button color="error" variant="contained" onClick={() => setOpen(true)}>
        {buttonLabel}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningRounded color="error" />
          {title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">{description}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={action}>
            <Button type="submit" variant="contained" color="error">
              {buttonLabel}
            </Button>
          </form>
        </DialogActions>
      </Dialog>
    </>
  );
}
