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
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import HomeRounded from "@mui/icons-material/HomeRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import GradingRounded from "@mui/icons-material/GradingRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import FlagRounded from "@mui/icons-material/FlagRounded";
import { useCourse } from "./CourseProvider";

const SIDEBAR_WIDTH = 240;

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** If true, requires a selected course and href is a suffix after /courses/[id] */
  courseScoped?: boolean;
  /**
   * Override the resolved href entirely (receives the selectedCourseId).
   * Used when the target URL doesn't follow the /courses/[id] prefix pattern.
   */
  buildHref?: (selectedCourseId: string | null) => string | null;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <HomeRounded /> },
  {
    label: "Groups",
    href: "/groups",
    icon: <GroupsRounded />,
    courseScoped: true,
  },
  {
    label: "Checkpoints",
    href: "/checkpoints",
    icon: <FlagRounded />,
    courseScoped: true,
  },
  {
    label: "Grading",
    href: "/grading",
    icon: <GradingRounded />,
    buildHref: (id) => (id ? `/grading/${id}` : null),
  },
];

/** Shown at the bottom of the nav list, above the user footer. */
const bottomNavItems: NavItem[] = [
  {
    label: "Course management",
    href: "/courses",
    icon: <SchoolRounded />,
  },
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
  const { courses, selectedCourseId, selectedCourse, selectCourse } =
    useCourse();

  function resolveItem(item: NavItem): {
    href: string | null;
    active: boolean;
    disabled: boolean;
  } {
    if (item.buildHref) {
      const href = item.buildHref(selectedCourseId);
      const active =
        pathname === item.href ||
        pathname.startsWith(item.href + "/") ||
        (href !== null &&
          (pathname === href || pathname.startsWith(href + "/")));
      return { href, active, disabled: href === null };
    }
    if (item.courseScoped) {
      const href = selectedCourseId
        ? `/courses/${selectedCourseId}${item.href}`
        : null;
      const active =
        !!selectedCourseId &&
        pathname.includes(`/courses/${selectedCourseId}${item.href}`);
      return { href, active, disabled: !selectedCourseId };
    }
    const active =
      pathname === item.href || pathname.startsWith(item.href + "/");
    return { href: item.href, active, disabled: false };
  }

  function NavItemRow({ item }: { item: NavItem }) {
    const { href, active, disabled } = resolveItem(item);
    return (
      <ListItem disablePadding sx={{ px: 1, pb: 0.5 }}>
        <ListItemButton
          component={disabled || !href ? "div" : NextLink}
          href={disabled || !href ? undefined : href}
          selected={active}
          disabled={disabled}
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
  }

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

      {/* Course selector */}
      {courses.length > 0 && (
        <Box sx={{ px: 1.5, py: 1.5 }}>
          <FormControl fullWidth size="small">
            <Select
              value={selectedCourseId ?? ""}
              onChange={(e) => selectCourse(e.target.value)}
              displayEmpty
              renderValue={(value) => {
                if (!value) return <em>Select course...</em>;
                return selectedCourse
                  ? `${selectedCourse.name} (${selectedCourse.semester})`
                  : "";
              }}
              sx={{ fontSize: "0.85rem" }}
            >
              {courses.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} ({c.semester})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <Divider />
      <List sx={{ flex: 1, pt: 1 }}>
        {navItems.map((item) => (
          <NavItemRow key={item.label} item={item} />
        ))}
      </List>

      <Divider />
      <List sx={{ pt: 0.5, pb: 0.5 }}>
        {bottomNavItems.map((item) => (
          <NavItemRow key={item.label} item={item} />
        ))}
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
