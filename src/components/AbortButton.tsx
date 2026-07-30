"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import StopRounded from "@mui/icons-material/StopRounded";
import { useState } from "react";

interface AbortButtonProps {
  action: () => Promise<void> | void;
}

export default function AbortButton({ action }: AbortButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="warning"
        startIcon={<StopRounded />}
        onClick={() => setOpen(true)}
      >
        Abort
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Abort Analysis</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Stop the running analysis? The checkpoint will revert to pending and
            can be re-run.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form
            action={() => {
              setOpen(false);
              return action();
            }}
          >
            <Button type="submit" variant="contained" color="warning">
              Abort
            </Button>
          </form>
        </DialogActions>
      </Dialog>
    </>
  );
}
