"use client";

import * as React from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import HomeRounded from "@mui/icons-material/HomeRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import GradingRounded from "@mui/icons-material/GradingRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";

const SIDEBAR_WIDTH = 240;

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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        width: SIDEBAR_WIDTH,
      }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Imprint
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flex: 1, pt: 1 }}>
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <ListItem key={item.href} disablePadding sx={{ px: 1, pb: 0.5 }}>
              <ListItemButton
                component={NextLink}
                href={item.href}
                selected={active}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      variant: "body2",
                      sx: { fontWeight: active ? 600 : undefined },
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" noWrap>
            {user.name}
          </Typography>
          <Typography variant="caption" noWrap color="text.secondary">
            {user.email}
          </Typography>
        </Box>
        <Tooltip title="Sign out">
          <form action={signOutAction}>
            <IconButton type="submit" size="small">
              <LogoutRounded fontSize="small" />
            </IconButton>
          </form>
        </Tooltip>
      </Box>
    </Box>
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
          width: SIDEBAR_WIDTH,
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
        slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH } } }}
      >
        <SidebarContent user={user} signOutAction={signOutAction} />
      </Drawer>
    </>
  );
}
