import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export default function Loading() {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width={200} height={20} sx={{ mb: 2 }} />
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 3 }}>
        <Skeleton variant="text" width={240} height={36} />
        <Skeleton variant="rounded" width={90} height={28} />
        <Skeleton variant="rounded" width={100} height={32} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Skeleton variant="rounded" width={80} height={36} />
        <Skeleton variant="rounded" width={80} height={36} />
        <Skeleton variant="rounded" width={80} height={36} />
      </Stack>
      <Skeleton
        variant="rectangular"
        height={120}
        sx={{ borderRadius: 1, mb: 2 }}
      />
      <Stack spacing={1}>
        <Skeleton variant="rectangular" height={64} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={64} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={64} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={64} sx={{ borderRadius: 1 }} />
      </Stack>
    </Box>
  );
}
