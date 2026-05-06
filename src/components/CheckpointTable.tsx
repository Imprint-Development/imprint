import NextLink from "next/link";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { CHECKPOINT_STATUS_COLOR } from "@/lib/constants";

export interface CheckpointRow {
  id: string;
  name: string;
  status: string;
  gitRef?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  enabledPipelines?: string[];
}

interface Props {
  checkpoints: CheckpointRow[];
  /**
   * Builds the href for a row. The entire row becomes clickable via a
   * full-cell ::after overlay on the name link.
   */
  href: (cp: CheckpointRow) => string;
  /** Which optional columns to show. Name and Status are always shown. */
  columns?: {
    gitRef?: boolean;
    startDate?: boolean;
    endDate?: boolean;
  };
  /** Renders extra content in a trailing Actions cell. */
  renderActions?: (cp: CheckpointRow) => React.ReactNode;
  /** Pass sx={{ border: 0 }} for borderless variant (e.g. inside a Card). */
  borderless?: boolean;
}

export default function CheckpointTable({
  checkpoints,
  href,
  columns = {},
  renderActions,
  borderless = false,
}: Props) {
  const { gitRef = false, startDate = false, endDate = false } = columns;
  const showActions = !!renderActions;
  const sorted = [...checkpoints].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <TableContainer
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        ...(borderless ? { border: 0, borderRadius: 0 } : {}),
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            {gitRef && <TableCell>Git Ref</TableCell>}
            <TableCell>Status</TableCell>
            {startDate && <TableCell>Start Date</TableCell>}
            {endDate && <TableCell>End Date</TableCell>}
            {showActions && <TableCell>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((cp) => (
            <TableRow key={cp.id} hover sx={{ position: "relative" }}>
              <TableCell>
                {/* ::after overlay makes the whole row clickable */}
                <NextLink
                  href={href(cp)}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 0,
                    }}
                    aria-hidden
                  />
                  <span style={{ position: "relative", zIndex: 1 }}>
                    {cp.name}
                  </span>
                </NextLink>
              </TableCell>
              {gitRef && (
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {cp.gitRef ?? "—"}
                  </Typography>
                </TableCell>
              )}
              <TableCell>
                <Chip
                  size="small"
                  label={cp.status}
                  color={
                    CHECKPOINT_STATUS_COLOR[
                      cp.status as keyof typeof CHECKPOINT_STATUS_COLOR
                    ] ?? "default"
                  }
                />
              </TableCell>
              {startDate && (
                <TableCell>
                  {cp.startDate
                    ? new Date(cp.startDate).toLocaleDateString()
                    : "—"}
                </TableCell>
              )}
              {endDate && (
                <TableCell>
                  {cp.endDate ? new Date(cp.endDate).toLocaleDateString() : "—"}
                </TableCell>
              )}
              {showActions && (
                <TableCell sx={{ position: "relative", zIndex: 1 }}>
                  {renderActions!(cp)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
