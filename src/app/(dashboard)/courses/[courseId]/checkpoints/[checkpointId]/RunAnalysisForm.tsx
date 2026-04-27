"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Typography from "@mui/material/Typography";
import { PIPELINE_REGISTRY } from "@/lib/analysis/pipelines/registry";

interface Props {
  action: (formData: FormData) => void | Promise<void>;
  enabledPipelines: string[];
  submitLabel?: string;
}

export default function RunAnalysisForm({
  action,
  enabledPipelines,
  submitLabel = "Run Analysis",
}: Props) {
  return (
    <form action={action}>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
        Pipelines
      </Typography>
      <FormGroup row sx={{ mb: 2 }}>
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
      <Box>
        <Button type="submit" variant="contained">
          {submitLabel}
        </Button>
      </Box>
    </form>
  );
}
