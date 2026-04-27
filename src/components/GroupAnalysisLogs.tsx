"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseRounded from "@mui/icons-material/CloseRounded";
import AnalysisLogsWithRefresh from "./AnalysisLogsWithRefresh";

interface Props {
  checkpointId: string;
  groupId: string;
  groupName: string;
  initialStatus: string;
}

export default function GroupAnalysisLogs({
  checkpointId,
  groupId,
  groupName,
  initialStatus,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
        View Logs
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", gap: 1, pr: 6 }}
        >
          Analysis Logs — {groupName}
          <IconButton
            size="small"
            onClick={() => setOpen(false)}
            sx={{ position: "absolute", right: 12, top: 12 }}
            aria-label="close"
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2 }}>
          {open && (
            <AnalysisLogsWithRefresh
              checkpointId={checkpointId}
              groupId={groupId}
              initialStatus={initialStatus}
            />
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
