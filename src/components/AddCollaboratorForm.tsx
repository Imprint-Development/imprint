"use client";

import { useActionState, useEffect, useRef } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && state.error === null) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state.error]);

  return (
    <form ref={formRef} action={formAction} aria-label="Add collaborator">
      <Stack direction="row" spacing={1}>
        <TextField
          name="email"
          label="Email address"
          type="email"
          size="small"
          required
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
