"use client";

import Button from "@mui/material/Button";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import ImportModal from "@/components/ImportModal";
import { useState } from "react";

export default function ImportCsvButton({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        startIcon={<UploadFileRounded />}
        onClick={() => setOpen(true)}
      >
        Import CSV
      </Button>
      <ImportModal
        courseId={courseId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
