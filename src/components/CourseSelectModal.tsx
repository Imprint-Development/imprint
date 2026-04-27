"use client";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useCourse } from "./CourseProvider";

export default function CourseSelectModal() {
  const { courses, needsSelection, selectCourse } = useCourse();

  if (!needsSelection) return null;

  return (
    <Dialog open maxWidth="xs" fullWidth>
      <DialogTitle>Select a Course</DialogTitle>
      <DialogContent>
        {courses.length === 0 ? (
          <Typography color="text.secondary">
            No courses available. Create one first.
          </Typography>
        ) : (
          <List disablePadding>
            {courses.map((c) => (
              <ListItemButton
                key={c.id}
                onClick={() => selectCourse(c.id)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemText primary={c.name} secondary={c.semester} />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
