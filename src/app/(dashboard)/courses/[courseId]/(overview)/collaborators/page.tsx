import { db } from "@/lib/db";
import { courseCollaborators, users } from "@/lib/db/schema";
import { addCollaborator, removeCollaborator } from "@/lib/actions/courses";
import { eq } from "drizzle-orm";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import DeleteRounded from "@mui/icons-material/DeleteRounded";

export default async function CollaboratorsTabPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const collaborators = await db
    .select({
      id: courseCollaborators.id,
      role: courseCollaborators.role,
      email: users.email,
    })
    .from(courseCollaborators)
    .innerJoin(users, eq(users.id, courseCollaborators.userId))
    .where(eq(courseCollaborators.courseId, courseId));

  const addCollaboratorWithId = addCollaborator.bind(null, courseId);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Collaborators
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell sx={{ width: 60 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {collaborators.map((collab) => (
              <TableRow key={collab.id}>
                <TableCell>{collab.email}</TableCell>
                <TableCell>
                  <Chip size="small" label={collab.role} variant="outlined" />
                </TableCell>
                <TableCell>
                  <form
                    action={removeCollaborator.bind(null, collab.id, courseId)}
                  >
                    <IconButton type="submit" size="small" color="error">
                      <DeleteRounded />
                    </IconButton>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 2 }} />

      <form action={addCollaboratorWithId}>
        <Stack direction="row" spacing={1}>
          <TextField
            name="email"
            placeholder="Email address"
            type="email"
            size="small"
            sx={{ flex: 1, maxWidth: 400 }}
          />
          <Button type="submit" size="small" variant="contained">
            Add
          </Button>
        </Stack>
      </form>
    </Box>
  );
}
