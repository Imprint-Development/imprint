"use client";

import Box from "@mui/joy/Box";
import Sheet from "@mui/joy/Sheet";
import IconButton from "@mui/joy/IconButton";
import Typography from "@mui/joy/Typography";
import GlobalStyles from "@mui/joy/GlobalStyles";
import MenuRounded from "@mui/icons-material/MenuRounded";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <Sheet
      sx={{
        display: { xs: "flex", md: "none" },
        alignItems: "center",
        gap: 1,
        position: "fixed",
        top: 0,
        width: "100vw",
        height: "var(--Header-height)",
        zIndex: 9995,
        p: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.surface",
      }}
    >
      <GlobalStyles styles={{ ":root": { "--Header-height": "52px" } }} />
      <IconButton
        onClick={onMenuClick}
        variant="outlined"
        color="neutral"
        size="sm"
      >
        <MenuRounded />
      </IconButton>
      <Typography level="title-md" sx={{ fontWeight: 700 }}>
        Imprint
      </Typography>
    </Sheet>
  );
}
