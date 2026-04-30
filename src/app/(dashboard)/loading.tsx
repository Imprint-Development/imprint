import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export default function Loading() {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width={200} height={28} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={140} height={20} sx={{ mb: 3 }} />
      <Stack spacing={1}>
        <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 1 }} />
      </Stack>
    </Box>
  );
}
