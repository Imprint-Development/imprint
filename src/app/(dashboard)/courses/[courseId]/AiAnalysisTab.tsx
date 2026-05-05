"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import FormHelperText from "@mui/material/FormHelperText";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import { updateAiAnalysisConfig } from "@/lib/actions/courses";
import type { AiAnalysisConfig } from "@/lib/db/schema";
import { DEFAULT_AI_SYSTEM_PROMPT } from "@/lib/db/schema";
import {
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
} from "@/lib/analysis/pipelines/ai-report-constants";

interface Props {
  courseId: string;
  config: AiAnalysisConfig;
}

const MODEL_MAP = {
  openai: OPENAI_MODELS as readonly { value: string; label: string }[],
  anthropic: ANTHROPIC_MODELS as readonly { value: string; label: string }[],
};

export default function AiAnalysisTab({ courseId, config }: Props) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [provider, setProvider] = useState<"openai" | "anthropic">(
    config.provider
  );
  const [model, setModel] = useState(config.model);
  const [systemPrompt, setSystemPrompt] = useState(
    config.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT
  );
  const [baseUrl, setBaseUrl] = useState(config.baseUrl ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const models = MODEL_MAP[provider];

  // When provider changes, reset model to the first option for that provider
  function handleProviderChange(newProvider: "openai" | "anthropic") {
    setProvider(newProvider);
    setModel(MODEL_MAP[newProvider][0]?.value ?? "");
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateAiAnalysisConfig(courseId, {
          enabled,
          provider,
          model,
          systemPrompt,
          ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <Box sx={{ maxWidth: 700 }}>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            AI Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            When enabled, an <strong>AI Report</strong> pipeline becomes
            available on each checkpoint. It reads the contribution metrics
            produced by the other pipelines and generates a written Markdown
            report per student plus a group summary.
          </Typography>

          <Stack spacing={2.5}>
            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => {
                    setEnabled(e.target.checked);
                    setSaved(false);
                  }}
                />
              }
              label="Enable AI analysis for this course"
            />

            <FormControl>
              <FormLabel>Provider</FormLabel>
              <Select
                size="small"
                value={provider}
                onChange={(e) =>
                  handleProviderChange(e.target.value as "openai" | "anthropic")
                }
                sx={{ maxWidth: 220 }}
              >
                <MenuItem value="openai">OpenAI</MenuItem>
                <MenuItem value="anthropic">Anthropic</MenuItem>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Model</FormLabel>
              <Select
                size="small"
                value={
                  models.some((m) => m.value === model)
                    ? model
                    : (models[0]?.value ?? "")
                }
                onChange={(e) => {
                  setModel(e.target.value);
                  setSaved(false);
                }}
                sx={{ maxWidth: 280 }}
              >
                {models.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Custom Base URL (optional)</FormLabel>
              <TextField
                size="small"
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  setSaved(false);
                }}
                placeholder="e.g. https://openrouter.ai/api/v1"
                sx={{ maxWidth: 420 }}
              />
              <FormHelperText>
                Override the API endpoint — useful for OpenRouter, local Ollama,
                or any OpenAI-compatible server. Leave blank to use the
                provider&apos;s default.
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>System Prompt</FormLabel>
              <TextField
                multiline
                minRows={8}
                maxRows={20}
                value={systemPrompt}
                onChange={(e) => {
                  setSystemPrompt(e.target.value);
                  setSaved(false);
                }}
                fullWidth
                size="small"
              />
              <FormHelperText>
                Used for both per-student reports and the group summary. The
                same prompt is sent for both; the user message distinguishes the
                two cases.
              </FormHelperText>
            </FormControl>

            <Button
              variant="text"
              size="small"
              sx={{ alignSelf: "flex-start" }}
              onClick={() => {
                setSystemPrompt(DEFAULT_AI_SYSTEM_PROMPT);
                setSaved(false);
              }}
            >
              Reset to default prompt
            </Button>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Alert severity="info" sx={{ mb: 2 }}>
            The API key is read from the <code>OPENAI_API_KEY</code> /{" "}
            <code>ANTHROPIC_API_KEY</code> environment variable on the server.
            It is never stored in the database.
          </Alert>

          {saved && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Configuration saved.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button variant="contained" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save Configuration"}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
