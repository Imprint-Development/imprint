"use client";

import { useActionState } from "react";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

interface Props {
  action: (
    prevState: { error: string | null },
    formData: FormData
  ) => Promise<{ error: string | null }>;
}

const initialState = { error: null };

export default function AddCollaboratorForm({ action }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      <Stack direction="row" spacing={1}>
        <TextField
          name="email"
          placeholder="Email address"
          type="email"
          size="small"
          inputProps={{ "aria-label": "Collaborator email address" }}
          sx={{ flex: 1, maxWidth: 400 }}
        />
        <Button
          type="submit"
          size="small"
          variant="contained"
          disabled={isPending}
        >
          Add
        </Button>
      </Stack>
      {state.error && (
        <Alert severity="error" role="alert" sx={{ mt: 1, maxWidth: 460 }}>
          {state.error}
        </Alert>
      )}
    </form>
  );
}
