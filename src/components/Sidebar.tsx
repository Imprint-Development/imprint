"use client";

import * as React from "react";
import NextLink from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { styled } from "@mui/material/styles";
import MuiDrawer, { drawerClasses } from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import HomeRounded from "@mui/icons-material/HomeRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import GradingRounded from "@mui/icons-material/GradingRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import FlagRounded from "@mui/icons-material/FlagRounded";
import AdminPanelSettingsRounded from "@mui/icons-material/AdminPanelSettingsRounded";
import BugReportRounded from "@mui/icons-material/BugReportRounded";
import ColorModeIconDropdown from "@/components/ColorModeIconDropdown";
import { useCourse } from "./CourseProvider";

const SIDEBAR_WIDTH = 240;

const PermanentDrawer = styled(MuiDrawer)({
  width: SIDEBAR_WIDTH,
  flexShrink: 0,
  boxSizing: "border-box",
  [`& .${drawerClasses.paper}`]: {
    width: SIDEBAR_WIDTH,
    boxSizing: "border-box",
  },
});

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  courseScoped?: boolean;
  buildHref?: (selectedCourseId: string | null) => string | null;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <HomeRounded />,
    courseScoped: true,
  },
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

const bottomNavItems: NavItem[] = [
  { label: "Course management", href: "/courses", icon: <SchoolRounded /> },
];

function NavItemRow({
  item,
  href,
  active,
  disabled,
}: {
  item: NavItem;
  href: string | null;
  active: boolean;
  disabled: boolean;
}) {
  return (
    <ListItem disablePadding sx={{ display: "block" }}>
      <ListItemButton
        component={disabled || !href ? "div" : NextLink}
        href={disabled || !href ? undefined : href}
        selected={active}
        disabled={disabled}
        sx={{ borderRadius: 1, gap: 1 }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            color: active ? "text.primary" : "text.secondary",
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          slotProps={{
            primary: {
              variant: "body2",
              sx: { fontWeight: active ? 600 : 500 },
            },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}

interface SidebarProps {
  user: { name: string; email: string };
  signOutAction: () => Promise<void>;
  isAdmin?: boolean;
  open?: boolean;
  onClose?: () => void;
}

function SidebarContent({
  user,
  signOutAction,
  isAdmin,
}: Pick<SidebarProps, "user" | "signOutAction" | "isAdmin">) {
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

  const userInitials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "background.default",
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <NextImage
          src="/header-logo.png"
          alt="Imprint"
          width={140}
          height={42}
          style={{ objectFit: "contain" }}
          priority
        />
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
                if (!value) return <em>Select course…</em>;
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

      {/* Main nav */}
      <Box
        sx={{
          overflow: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <List sx={{ flex: 1, p: 1 }}>
          {navItems.map((item) => {
            const resolved = resolveItem(item);
            return <NavItemRow key={item.label} item={item} {...resolved} />;
          })}
        </List>

        <Divider />

        <List sx={{ p: 1 }}>
          {bottomNavItems.map((item) => {
            const resolved = resolveItem(item);
            return <NavItemRow key={item.label} item={item} {...resolved} />;
          })}
          {isAdmin && (
            <>
              <NavItemRow
                item={{
                  label: "Admin",
                  href: "/admin",
                  icon: <AdminPanelSettingsRounded />,
                }}
                href="/admin"
                active={
                  (pathname === "/admin" || pathname.startsWith("/admin/")) &&
                  !pathname.startsWith("/admin/debug")
                }
                disabled={false}
              />
              <NavItemRow
                item={{
                  label: "Debug",
                  href: "/admin/debug",
                  icon: <BugReportRounded />,
                }}
                href="/admin/debug"
                active={pathname.startsWith("/admin/debug")}
                disabled={false}
              />
            </>
          )}
        </List>
      </Box>

      {/* User footer */}
      <Divider />
      <Stack
        direction="row"
        sx={{
          p: 1.5,
          gap: 1,
          alignItems: "center",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: "0.75rem",
            fontWeight: 700,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            flexShrink: 0,
          }}
        >
          {userInitials}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, lineHeight: "16px" }}
            noWrap
          >
            {user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user.email}
          </Typography>
        </Box>
        <ColorModeIconDropdown size="small" sx={{ flexShrink: 0 }} />
        <Tooltip title="Sign out">
          <form action={signOutAction}>
            <IconButton type="submit" size="small">
              <LogoutRounded fontSize="small" />
            </IconButton>
          </form>
        </Tooltip>
      </Stack>
    </Box>
  );
}

export default function Sidebar({
  user,
  signOutAction,
  isAdmin,
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Desktop — permanent */}
      <PermanentDrawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          [`& .${drawerClasses.paper}`]: {
            backgroundColor: "background.default",
          },
        }}
      >
        <SidebarContent
          user={user}
          signOutAction={signOutAction}
          isAdmin={isAdmin}
        />
      </PermanentDrawer>

      {/* Mobile — temporary */}
      <MuiDrawer
        open={open ?? false}
        onClose={onClose}
        sx={{
          display: { xs: "block", md: "none" },
          [`& .${drawerClasses.paper}`]: {
            width: SIDEBAR_WIDTH,
            backgroundColor: "background.default",
          },
        }}
      >
        <SidebarContent
          user={user}
          signOutAction={signOutAction}
          isAdmin={isAdmin}
        />
      </MuiDrawer>
    </>
  );
}
