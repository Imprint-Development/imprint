"use client";

import { importCsv } from "@/lib/actions/import";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Button from "@mui/joy/Button";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Checkbox from "@mui/joy/Checkbox";
import Sheet from "@mui/joy/Sheet";
import Table from "@mui/joy/Table";
import Divider from "@mui/joy/Divider";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import { useState, useRef } from "react";

interface ImportClientProps {
  courseId: string;
  courseName: string;
}

interface PreviewRow {
  vorname: string;
  nachname: string;
  email: string;
  gruppe: string;
}

const DELIMITERS: { value: string; label: string }[] = [
  { value: "\t", label: "Tab" },
  { value: ",", label: "Comma" },
  { value: ";", label: "Semicolon" },
];

function parseCsvPreview(text: string, delimiter: string): PreviewRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());

  const col = {
    nachname: headers.findIndex((h) => h === "nachname"),
    vorname: headers.findIndex((h) => h === "vorname"),
    email: headers.findIndex(
      (h) => h === "e-mail-adresse" || h === "email" || h === "e-mail"
    ),
    gruppe: headers.findIndex((h) => h === "gruppe" || h === "group"),
  };

  const rows: PreviewRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.trim());
    rows.push({
      vorname: col.vorname >= 0 ? (cols[col.vorname] ?? "") : "",
      nachname: col.nachname >= 0 ? (cols[col.nachname] ?? "") : "",
      email: col.email >= 0 ? (cols[col.email] ?? "") : "",
      gruppe: col.gruppe >= 0 ? (cols[col.gruppe] ?? "") : "",
    });
  }
  return rows;
}

export default function ImportClient({
  courseId,
  courseName,
}: ImportClientProps) {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [onlyWithGroup, setOnlyWithGroup] = useState(true);
  const [delimiter, setDelimiter] = useState("\t");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDone(false);
    const text = await file.text();
    setFileText(text);
    setPreview(parseCsvPreview(text, delimiter));
  };

  const handleDelimiterChange = (newDelimiter: string) => {
    setDelimiter(newDelimiter);
    if (fileText) {
      setPreview(parseCsvPreview(fileText, newDelimiter));
    }
  };

  const displayed = onlyWithGroup
    ? preview.filter((r) => r.gruppe.trim() !== "")
    : preview;

  const groupCount = new Set(displayed.map((r) => r.gruppe || "Ungrouped"))
    .size;

  const handleSubmit = async (formData: FormData) => {
    setImporting(true);
    try {
      await importCsv(courseId, formData);
      setDone(true);
      setPreview([]);
      setFileName(null);
      formRef.current?.reset();
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box>
      <Card variant="outlined">
        <CardContent>
          <Typography level="title-lg" sx={{ mb: 2 }}>
            Import Students from CSV
          </Typography>
          <Typography level="body-sm" sx={{ mb: 2 }}>
            Upload a CSV file with columns: Nachname, Vorname, ID-Nummer,
            E-Mail-Adresse, Gruppe, Gruppenwahl. Groups and students will be
            created automatically.
          </Typography>

          <form ref={formRef} action={handleSubmit}>
            <Stack spacing={2}>
              <input type="hidden" name="delimiter" value={delimiter} />

              <Stack direction="row" spacing={2} alignItems="flex-end">
                <Button
                  component="label"
                  variant="outlined"
                  color="neutral"
                  startDecorator={<UploadFileRounded />}
                >
                  {fileName ?? "Choose CSV file"}
                  <input
                    type="file"
                    name="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileChange}
                    hidden
                  />
                </Button>

                <FormControl size="sm" sx={{ minWidth: 140 }}>
                  <FormLabel>Delimiter</FormLabel>
                  <Select
                    value={delimiter}
                    onChange={(_e, val) => val && handleDelimiterChange(val)}
                  >
                    {DELIMITERS.map((d) => (
                      <Option key={d.value} value={d.value}>
                        {d.label}
                      </Option>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Checkbox
                label="Only import rows where a group is assigned"
                name="onlyWithGroup"
                checked={onlyWithGroup}
                onChange={(e) => setOnlyWithGroup(e.target.checked)}
                defaultChecked
              />

              {preview.length > 0 && (
                <Sheet variant="soft" sx={{ p: 1.5, borderRadius: "sm" }}>
                  <Typography level="body-sm">
                    {displayed.length} student{displayed.length !== 1 && "s"} in{" "}
                    {groupCount} group{groupCount !== 1 && "s"} will be imported
                    {onlyWithGroup &&
                      preview.length !== displayed.length &&
                      ` (${preview.length - displayed.length} skipped — no group)`}
                  </Typography>
                </Sheet>
              )}

              <Button
                type="submit"
                disabled={!fileName || importing}
                loading={importing}
              >
                Import
              </Button>
            </Stack>
          </form>

          {done && (
            <Sheet
              variant="soft"
              color="success"
              sx={{ p: 2, borderRadius: "sm", mt: 2 }}
            >
              <Typography color="success">
                Import complete. Groups and students have been created.
              </Typography>
            </Sheet>
          )}
        </CardContent>
      </Card>

      {displayed.length > 0 && (
        <Card variant="outlined" sx={{ mt: 3 }}>
          <CardContent>
            <Typography level="title-lg" sx={{ mb: 1 }}>
              Preview
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <Sheet sx={{ overflow: "auto", maxHeight: 400 }}>
              <Table size="sm" stickyHeader>
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((row, i) => (
                    <tr key={i}>
                      <td>{row.gruppe || "Ungrouped"}</td>
                      <td>{row.vorname}</td>
                      <td>{row.nachname}</td>
                      <td>{row.email}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Sheet>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
