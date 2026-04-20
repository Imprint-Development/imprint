"use client";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import MenuRounded from "@mui/icons-material/MenuRounded";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        display: { xs: "flex", md: "none" },
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
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Imprint
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
