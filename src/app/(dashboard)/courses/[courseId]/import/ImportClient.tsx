"use client";

import { importCsv } from "@/lib/actions/import";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Divider from "@mui/material/Divider";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Alert from "@mui/material/Alert";
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
          <Typography variant="h6" sx={{ mb: 2 }}>
            Import Students from CSV
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Upload a CSV file with columns: Nachname, Vorname, ID-Nummer,
            E-Mail-Adresse, Gruppe, Gruppenwahl. Groups and students will be
            created automatically.
          </Typography>

          <form ref={formRef} action={handleSubmit}>
            <Stack spacing={2}>
              <input type="hidden" name="delimiter" value={delimiter} />

              <Stack direction="row" spacing={2} sx={{ alignItems: "flex-end" }}>
                <Button
                  component="label"
                  variant="outlined"
                  color="inherit"
                  startIcon={<UploadFileRounded />}
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

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <FormLabel>Delimiter</FormLabel>
                  <Select
                    value={delimiter}
                    onChange={(e) => handleDelimiterChange(e.target.value)}
                    size="small"
                  >
                    {DELIMITERS.map((d) => (
                      <MenuItem key={d.value} value={d.value}>
                        {d.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <FormControlLabel
                control={
                  <Checkbox
                    name="onlyWithGroup"
                    checked={onlyWithGroup}
                    onChange={(e) => setOnlyWithGroup(e.target.checked)}
                    defaultChecked
                  />
                }
                label="Only import rows where a group is assigned"
              />

              {preview.length > 0 && (
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "action.hover" }}>
                  <Typography variant="body2">
                    {displayed.length} student{displayed.length !== 1 && "s"} in{" "}
                    {groupCount} group{groupCount !== 1 && "s"} will be imported
                    {onlyWithGroup &&
                      preview.length !== displayed.length &&
                      ` (${preview.length - displayed.length} skipped — no group)`}
                  </Typography>
                </Paper>
              )}

              <Button
                type="submit"
                variant="contained"
                disabled={!fileName || importing}
              >
                {importing ? "Importing…" : "Import"}
              </Button>
            </Stack>
          </form>

          {done && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Import complete. Groups and students have been created.
            </Alert>
          )}
        </CardContent>
      </Card>

      {displayed.length > 0 && (
        <Card variant="outlined" sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Preview
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Group</TableCell>
                    <TableCell>First Name</TableCell>
                    <TableCell>Last Name</TableCell>
                    <TableCell>Email</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayed.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.gruppe || "Ungrouped"}</TableCell>
                      <TableCell>{row.vorname}</TableCell>
                      <TableCell>{row.nachname}</TableCell>
                      <TableCell>{row.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
