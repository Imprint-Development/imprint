"use client";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import MenuRounded from "@mui/icons-material/MenuRounded";
import ColorModeIconDropdown from "@/components/ColorModeIconDropdown";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <AppBar
      position="fixed"
      sx={{
        display: { xs: "flex", md: "none" },
        boxShadow: 0,
        bgcolor: "background.paper",
        backgroundImage: "none",
        borderBottom: "1px solid",
        borderColor: "divider",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar variant="dense">
        <IconButton
          edge="start"
          onClick={onMenuClick}
          size="small"
          sx={{ mr: 1 }}
        >
          <MenuRounded />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
          Imprint
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <ColorModeIconDropdown />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
