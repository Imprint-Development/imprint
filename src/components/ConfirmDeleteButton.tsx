"use client";

import Button from "@mui/joy/Button";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import DialogTitle from "@mui/joy/DialogTitle";
import DialogContent from "@mui/joy/DialogContent";
import DialogActions from "@mui/joy/DialogActions";
import Typography from "@mui/joy/Typography";
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
      <Button color="danger" variant="solid" onClick={() => setOpen(true)}>
        {buttonLabel}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog variant="outlined" role="alertdialog">
          <DialogTitle>
            <WarningRounded />
            {title}
          </DialogTitle>
          <DialogContent>
            <Typography level="body-sm">{description}</Typography>
          </DialogContent>
          <DialogActions>
            <form action={action}>
              <Button type="submit" variant="solid" color="danger">
                {buttonLabel}
              </Button>
            </form>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </>
  );
}
