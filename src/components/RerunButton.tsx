"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import ReplayRounded from "@mui/icons-material/ReplayRounded";
import { PIPELINE_REGISTRY } from "@/lib/analysis/pipelines/registry";

interface Props {
  action: (formData: FormData) => void | Promise<void>;
  enabledPipelines: string[];
}

export default function RerunButton({ action, enabledPipelines }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="warning"
        startIcon={<ReplayRounded />}
        onClick={() => setOpen(true)}
      >
        Re-run
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Re-run Analysis</DialogTitle>
        <form
          action={(formData) => {
            setOpen(false);
            return action(formData);
          }}
        >
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Pipelines
            </Typography>
            <FormGroup>
              {PIPELINE_REGISTRY.map((p) => (
                <FormControlLabel
                  key={p.id}
                  control={
                    <Checkbox
                      name="pipeline"
                      value={p.id}
                      defaultChecked={enabledPipelines.includes(p.id)}
                    />
                  }
                  label={p.label}
                />
              ))}
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Run
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
