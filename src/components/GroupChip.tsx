"use client";

import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";

// A fixed palette of hues that are visually distinct and work in both
// light and dark mode. We pick one deterministically from the group name.
const HUES = [210, 150, 30, 280, 0, 180, 320, 60, 240, 110];

function hueForName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return HUES[hash % HUES.length];
}

interface Props {
  label: string;
  size?: "small" | "medium";
}

export default function GroupChip({ label, size = "small" }: Props) {
  const theme = useTheme();
  const hue = hueForName(label);
  const isDark = theme.palette.mode === "dark";

  const bg = `hsl(${hue}, 60%, ${isDark ? "20%" : "92%"})`;
  const border = `hsl(${hue}, 50%, ${isDark ? "35%" : "70%"})`;
  const color = `hsl(${hue}, 50%, ${isDark ? "80%" : "30%"})`;

  return (
    <Chip
      label={label}
      size={size}
      variant="outlined"
      sx={{
        backgroundColor: bg,
        borderColor: border,
        color,
        fontWeight: 500,
      }}
    />
  );
}
