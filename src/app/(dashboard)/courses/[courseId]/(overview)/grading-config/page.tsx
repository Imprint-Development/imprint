import { db } from "@/lib/db";
import { courses, checkpoints } from "@/lib/db/schema";
import type { GradingConfig } from "@/lib/db/schema";
import {
  addGradingCategory,
  removeGradingCategory,
  renameGradingCategory,
  moveGradingCategory,
  addGradeThreshold,
  removeGradeThreshold,
  setCheckpointCategoryMaxPoints,
} from "@/lib/actions/courses";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableContainer from "@mui/material/TableContainer";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import Save from "@mui/icons-material/Save";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";

export default async function GradingTabPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const [[course], courseCheckpoints] = await Promise.all([
    db.select().from(courses).where(eq(courses.id, courseId)).limit(1),
    db
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.courseId, courseId))
      .orderBy(checkpoints.createdAt),
  ]);

  if (!course) redirect("/courses");

  const config: GradingConfig = course.gradingConfig;
  const perCheckpointCategories = config.categories.filter(
    (c) => c.perCheckpoint
  );

  const addGradingCategoryWithId = addGradingCategory.bind(null, courseId);
  const addGradeThresholdWithId = addGradeThreshold.bind(null, courseId);

  return (
    <Box sx={{ maxWidth: 700 }}>
      {/* Grading Categories */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Grading Categories
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Define point categories. Standalone categories apply once per
            student; per-checkpoint categories are graded for each checkpoint
            separately.
          </Typography>

          {config.categories.length > 0 && (
            <>
              {/* Off-screen rename forms — inputs reference these via the form= attribute */}
              {config.categories.map((cat) => (
                <form
                  key={`rename-${cat.id}`}
                  id={`rename-cat-${cat.id}`}
                  action={renameGradingCategory.bind(null, courseId, cat.id)}
                  style={{ display: "none" }}
                />
              ))}
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ mb: 2 }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell sx={{ width: 100 }}>Max Pts</TableCell>
                      <TableCell>Scope</TableCell>
                      <TableCell sx={{ width: 148 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {config.categories.map((cat, idx) => (
                      <TableRow key={cat.id}>
                        <TableCell>
                          <TextField
                            name="name"
                            defaultValue={cat.name}
                            size="small"
                            required
                            slotProps={{
                              htmlInput: { form: `rename-cat-${cat.id}` },
                            }}
                            sx={{ width: "100%", minWidth: 120 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            name="maxPoints"
                            type="number"
                            defaultValue={cat.maxPoints}
                            size="small"
                            required
                            slotProps={{
                              htmlInput: {
                                form: `rename-cat-${cat.id}`,
                                min: 0,
                                step: 0.5,
                              },
                            }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              cat.perCheckpoint
                                ? "Per checkpoint"
                                : "Standalone"
                            }
                            variant="outlined"
                            color={cat.perCheckpoint ? "primary" : "default"}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.25 }}>
                            {/* Save rename */}
                            <IconButton
                              type="submit"
                              form={`rename-cat-${cat.id}`}
                              size="small"
                              title="Save"
                            >
                              <Save fontSize="small" />
                            </IconButton>
                            {/* Move up */}
                            <form
                              action={moveGradingCategory.bind(
                                null,
                                courseId,
                                cat.id,
                                "up"
                              )}
                            >
                              <IconButton
                                type="submit"
                                size="small"
                                disabled={idx === 0}
                                title="Move up"
                              >
                                <ArrowUpward fontSize="small" />
                              </IconButton>
                            </form>
                            {/* Move down */}
                            <form
                              action={moveGradingCategory.bind(
                                null,
                                courseId,
                                cat.id,
                                "down"
                              )}
                            >
                              <IconButton
                                type="submit"
                                size="small"
                                disabled={idx === config.categories.length - 1}
                                title="Move down"
                              >
                                <ArrowDownward fontSize="small" />
                              </IconButton>
                            </form>
                            {/* Delete */}
                            <form
                              action={removeGradingCategory.bind(
                                null,
                                courseId,
                                cat.id
                              )}
                            >
                              <IconButton
                                type="submit"
                                size="small"
                                color="error"
                                title="Delete"
                              >
                                <DeleteRounded fontSize="small" />
                              </IconButton>
                            </form>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          <form action={addGradingCategoryWithId}>
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "flex-end" }}
              >
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Category Name</FormLabel>
                  <TextField
                    name="name"
                    placeholder="e.g. Code Quality"
                    size="small"
                    required
                  />
                </FormControl>
                <FormControl sx={{ width: 120 }}>
                  <FormLabel>Max Points</FormLabel>
                  <TextField
                    name="maxPoints"
                    type="number"
                    size="small"
                    required
                    slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                  />
                </FormControl>
                <FormControl sx={{ width: 160 }}>
                  <FormLabel>Scope</FormLabel>
                  <Select
                    name="perCheckpoint"
                    size="small"
                    defaultValue="false"
                  >
                    <MenuItem value="false">Standalone</MenuItem>
                    <MenuItem value="true">Per checkpoint</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  size="small"
                  variant="outlined"
                  startIcon={<AddRounded />}
                  sx={{ mb: 0.25 }}
                >
                  Add
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>

      {/* Grade Thresholds */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Grade Thresholds
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Map percentage ranges to letter grades or labels. The highest
            matching threshold is applied.
          </Typography>

          {config.gradeThresholds.length > 0 && (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Grade</TableCell>
                    <TableCell>Minimum %</TableCell>
                    <TableCell sx={{ width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...config.gradeThresholds]
                    .sort((a, b) => b.minPercentage - a.minPercentage)
                    .map((t) => (
                      <TableRow key={t.grade}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {t.grade}
                          </Typography>
                        </TableCell>
                        <TableCell>{t.minPercentage}%</TableCell>
                        <TableCell>
                          <form
                            action={removeGradeThreshold.bind(
                              null,
                              courseId,
                              t.grade
                            )}
                          >
                            <IconButton
                              type="submit"
                              size="small"
                              color="error"
                            >
                              <DeleteRounded fontSize="small" />
                            </IconButton>
                          </form>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Divider sx={{ my: 2 }} />

          <form action={addGradeThresholdWithId}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
              <FormControl sx={{ width: 120 }}>
                <FormLabel>Grade</FormLabel>
                <TextField
                  name="grade"
                  placeholder="e.g. A"
                  size="small"
                  required
                />
              </FormControl>
              <FormControl sx={{ width: 140 }}>
                <FormLabel>Min % (≥)</FormLabel>
                <TextField
                  name="minPercentage"
                  type="number"
                  size="small"
                  required
                  slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
                />
              </FormControl>
              <Button
                type="submit"
                size="small"
                variant="outlined"
                startIcon={<AddRounded />}
                sx={{ mb: 0.25 }}
              >
                Add
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>

      {/* Checkpoint Max Point Overrides */}
      {perCheckpointCategories.length > 0 && courseCheckpoints.length > 0 && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Checkpoint Max Point Overrides
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Override the max points for a specific category on a specific
              checkpoint. Leave blank to use the category default. Overridden
              values are highlighted in the grading view.
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Checkpoint</TableCell>
                    {perCheckpointCategories.map((cat) => (
                      <TableCell key={cat.id} sx={{ fontWeight: 700 }}>
                        {cat.name}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ display: "block", color: "text.secondary" }}
                        >
                          default: {cat.maxPoints}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {courseCheckpoints.map((cp) => (
                    <TableRow key={cp.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {cp.name}
                        </Typography>
                      </TableCell>
                      {perCheckpointCategories.map((cat) => {
                        const override =
                          config.checkpointOverrides?.[cp.id]?.[cat.id];
                        return (
                          <TableCell key={cat.id}>
                            <form
                              action={setCheckpointCategoryMaxPoints.bind(
                                null,
                                courseId,
                                cp.id,
                                cat.id
                              )}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <TextField
                                  name="maxPoints"
                                  type="number"
                                  size="small"
                                  defaultValue={override?.maxPoints ?? ""}
                                  placeholder={String(cat.maxPoints)}
                                  slotProps={{
                                    htmlInput: { min: 0, step: 0.5 },
                                  }}
                                  sx={{
                                    width: 88,
                                    "& input": override
                                      ? {
                                          color: "warning.main",
                                          fontWeight: 600,
                                        }
                                      : undefined,
                                  }}
                                />
                                <IconButton type="submit" size="small">
                                  <Save fontSize="small" />
                                </IconButton>
                              </Box>
                            </form>
                          </TableCell>
                        );
                      })}
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
