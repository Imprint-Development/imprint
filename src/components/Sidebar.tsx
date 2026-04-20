"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/joy/Box";
import Drawer from "@mui/joy/Drawer";
import Sheet from "@mui/joy/Sheet";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import ListItemButton from "@mui/joy/ListItemButton";
import ListItemContent from "@mui/joy/ListItemContent";
import ListItemDecorator from "@mui/joy/ListItemDecorator";
import Typography from "@mui/joy/Typography";
import Divider from "@mui/joy/Divider";
import IconButton from "@mui/joy/IconButton";
import GlobalStyles from "@mui/joy/GlobalStyles";
import HomeRounded from "@mui/icons-material/HomeRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import GradingRounded from "@mui/icons-material/GradingRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: <HomeRounded /> },
  { label: "Courses", href: "/courses", icon: <SchoolRounded /> },
  { label: "Grading", href: "/grading", icon: <GradingRounded /> },
];

interface SidebarProps {
  user: { name: string; email: string };
  signOutAction: () => Promise<void>;
  open?: boolean;
  onClose?: () => void;
}

function SidebarContent({
  user,
  signOutAction,
}: Pick<SidebarProps, "user" | "signOutAction">) {
  const pathname = usePathname();

  return (
    <Sheet
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "background.surface",
        borderRight: "1px solid",
        borderColor: "divider",
      }}
    >
      <GlobalStyles
        styles={{
          ":root": {
            "--Sidebar-width": "240px",
          },
        }}
      />
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography level="title-lg" sx={{ fontWeight: 700 }}>
          Imprint
        </Typography>
      </Box>
      <Divider />
      <List
        sx={{
          flex: 1,
          "--ListItem-radius": "8px",
          "--List-padding": "8px",
          "--List-gap": "4px",
        }}
      >
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <ListItem key={item.href}>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={active}
                sx={{
                  fontWeight: active ? 600 : undefined,
                }}
              >
                <ListItemDecorator>{item.icon}</ListItemDecorator>
                <ListItemContent>{item.label}</ListItemContent>
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography level="title-sm" noWrap>
            {user.name}
          </Typography>
          <Typography level="body-xs" noWrap>
            {user.email}
          </Typography>
        </Box>
        <form action={signOutAction}>
          <IconButton type="submit" size="sm" variant="plain" color="neutral">
            <LogoutRounded />
          </IconButton>
        </form>
      </Box>
    </Sheet>
  );
}

export default function Sidebar({
  user,
  signOutAction,
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          width: "var(--Sidebar-width, 240px)",
          flexShrink: 0,
        }}
      >
        <SidebarContent user={user} signOutAction={signOutAction} />
      </Box>

      {/* Mobile drawer */}
      <Drawer
        open={open ?? false}
        onClose={onClose}
        sx={{ display: { xs: "block", md: "none" } }}
        slotProps={{
          content: {
            sx: { width: "var(--Sidebar-width, 240px)", p: 0 },
          },
        }}
      >
        <SidebarContent user={user} signOutAction={signOutAction} />
      </Drawer>
    </>
  );
}
