import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export default function Loading() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}
      >
        <Skeleton variant="text" width={260} height={36} />
        <Skeleton variant="rounded" width={120} height={36} />
      </Stack>
      <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
    </Box>
  );
}
