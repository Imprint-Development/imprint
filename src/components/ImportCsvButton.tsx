"use client";

import Button from "@mui/joy/Button";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import ImportModal from "@/components/ImportModal";
import { useState } from "react";

export default function ImportCsvButton({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outlined"
        color="neutral"
        startDecorator={<UploadFileRounded />}
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
