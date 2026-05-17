"use client";

import * as React from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { styled } from "@mui/material/styles";
import MuiAvatar from "@mui/material/Avatar";
import MuiDrawer, { drawerClasses } from "@mui/material/Drawer";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Select, { selectClasses } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import HomeRounded from "@mui/icons-material/HomeRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import GradingRounded from "@mui/icons-material/GradingRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import FlagRounded from "@mui/icons-material/FlagRounded";
import AdminPanelSettingsRounded from "@mui/icons-material/AdminPanelSettingsRounded";
import BugReportRounded from "@mui/icons-material/BugReportRounded";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import ColorModeIconDropdown from "@/components/ColorModeIconDropdown";
import { useCourse } from "./CourseProvider";
import type { CourseOption } from "./CourseProvider";
import MenuButton from "./MenuButton";

// ── styled primitives copied from template ──────────────────────────────────

const drawerWidth = 240;

const Drawer = styled(MuiDrawer)({
  width: drawerWidth,
  flexShrink: 0,
  boxSizing: "border-box",
  mt: 10,
  [`& .${drawerClasses.paper}`]: {
    width: drawerWidth,
    boxSizing: "border-box",
  },
});

const Avatar = styled(MuiAvatar)(({ theme }) => ({
  width: 28,
  height: 28,
  backgroundColor: (theme.vars || theme).palette.background.paper,
  color: (theme.vars || theme).palette.text.secondary,
  border: `1px solid ${(theme.vars || theme).palette.divider}`,
}));

// ── CourseSelectContent — mirrors template SelectContent ────────────────────

function CourseSelectContent() {
  const { courses, selectedCourseId, selectedCourse } = useCourse();
  const router = useRouter();
  const pathname = usePathname();

  function buildTarget(newCourseId: string) {
    // If currently on a course-scoped page, keep the section (e.g. /grading, /checkpoints)
    const match = pathname.match(/\/courses\/[^/]+(\/[^?]*)?/);
    const section = match?.[1] ?? "/dashboard";
    // Only keep the first path segment of the section to avoid landing on a
    // specific resource that doesn't exist in the new course (e.g. /checkpoints/123)
    const topSection = "/" + (section.split("/")[1] ?? "dashboard");
    return `/courses/${newCourseId}${topSection}`;
  }

  if (courses.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
        No courses available
      </Typography>
    );
  }

  return (
    <Select
      value={selectedCourseId ?? ""}
      onChange={(e) => router.push(buildTarget(e.target.value))}
      displayEmpty
      inputProps={{ "aria-label": "Select course" }}
      renderValue={() =>
        selectedCourse ? (
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <Avatar alt={selectedCourse.name} sx={{ width: 24, height: 24 }}>
              <SchoolOutlined sx={{ fontSize: "0.85rem" }} />
            </Avatar>
            <ListItemText
              primary={selectedCourse.name}
              secondary={selectedCourse.semester}
            />
          </Stack>
        ) : (
          <em>Select course…</em>
        )
      }
      fullWidth
      sx={{
        maxHeight: 56,
        width: 215,
        "&.MuiList-root": { p: "8px" },
        [`& .${selectClasses.select}`]: {
          display: "flex",
          alignItems: "center",
          gap: "2px",
          pl: 1,
        },
      }}
    >
      {[
        <ListSubheader key="__hdr" sx={{ pt: 0 }}>
          Courses
        </ListSubheader>,
        ...courses.map((c: CourseOption) => (
          <MenuItem key={c.id} value={c.id}>
            <ListItemText primary={c.name} secondary={c.semester} />
          </MenuItem>
        )),
      ]}
    </Select>
  );
}

// ── Nav items ─────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  courseScoped?: boolean;
  buildHref?: (selectedCourseId: string | null) => string | null;
}

const mainNavItems: NavItem[] = [
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
    courseScoped: true,
  },
];

const secondaryNavItems: NavItem[] = [
  { label: "Course management", href: "/courses", icon: <SchoolRounded /> },
];

// ── MenuContent — mirrors template MenuContent ──────────────────────────────

function MenuContent({
  isAdmin,
  lockedUsersCount = 0,
}: {
  isAdmin?: boolean;
  lockedUsersCount?: number;
}) {
  const pathname = usePathname();
  const { selectedCourseId } = useCourse();

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

  const adminItems: NavItem[] = isAdmin
    ? [
        {
          label: "Admin",
          href: "/admin",
          icon: (
            <Badge badgeContent={lockedUsersCount} color="warning" max={99}>
              <AdminPanelSettingsRounded />
            </Badge>
          ),
        },
        { label: "Debug", href: "/admin/debug", icon: <BugReportRounded /> },
      ]
    : [];

  function renderItems(items: NavItem[]) {
    return items.map((item) => {
      const { href, active, disabled } = resolveItem(item);
      return (
        <ListItem key={item.label} disablePadding sx={{ display: "block" }}>
          <ListItemButton
            component={disabled || !href ? "div" : NextLink}
            href={disabled || !href ? undefined : href}
            selected={active}
            disabled={disabled}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        </ListItem>
      );
    });
  }

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: "space-between" }}>
      <List dense>{renderItems(mainNavItems)}</List>
      <List dense>{renderItems([...secondaryNavItems, ...adminItems])}</List>
    </Stack>
  );
}

// ── OptionsMenu — sign-out + color mode ──────────────────────────────────────

function UserFooter({
  user,
  signOutAction,
}: {
  user: { name: string; email: string };
  signOutAction: () => Promise<void>;
}) {
  const userInitials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Stack
      direction="row"
      sx={{
        p: 2,
        gap: 1,
        alignItems: "center",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <MuiAvatar
        sizes="small"
        sx={{
          width: 36,
          height: 36,
          fontSize: "0.75rem",
          fontWeight: 700,
          bgcolor: "primary.main",
          color: "primary.contrastText",
        }}
      >
        {userInitials}
      </MuiAvatar>
      <Box sx={{ mr: "auto", minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, lineHeight: "16px" }}
          noWrap
        >
          {user.name}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
          {user.email}
        </Typography>
      </Box>
      <ColorModeIconDropdown size="small" />
      <Tooltip title="Sign out">
        <form action={signOutAction}>
          <MenuButton type="submit" aria-label="Sign out">
            <LogoutRounded />
          </MenuButton>
        </form>
      </Tooltip>
    </Stack>
  );
}

// ── SidebarContent — full sidebar body ───────────────────────────────────────

interface SidebarContentProps {
  user: { name: string; email: string };
  signOutAction: () => Promise<void>;
  isAdmin?: boolean;
  lockedUsersCount?: number;
}

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
const appSha = process.env.NEXT_PUBLIC_APP_SHA ?? "";
const displayVersion = /^\d/.test(appVersion) ? `v${appVersion}` : appVersion;

function SidebarContent({
  user,
  signOutAction,
  isAdmin,
  lockedUsersCount = 0,
}: SidebarContentProps) {
  return (
    <>
      <Box
        sx={{
          display: "flex",
          mt: "calc(var(--template-frame-height, 0px) + 4px)",
          p: 1.5,
        }}
      >
        <CourseSelectContent />
      </Box>
      <Divider />
      <Box
        sx={{
          overflow: "auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MenuContent isAdmin={isAdmin} lockedUsersCount={lockedUsersCount} />
      </Box>
      <Tooltip
        title={appSha || ""}
        placement="top"
        disableHoverListener={!appSha}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "center",
            py: 0.75,
            color: "text.disabled",
            borderTop: "1px solid",
            borderColor: "divider",
            cursor: appSha ? "default" : "unset",
          }}
        >
          Imprint {displayVersion}
        </Typography>
      </Tooltip>
      <UserFooter user={user} signOutAction={signOutAction} />
    </>
  );
}

// ── SideMenuMobile ─────────────────────────────────────────────────────────────

interface SideMenuMobileProps {
  open: boolean;
  toggleDrawer: (newOpen: boolean) => () => void;
  user: { name: string; email: string };
  signOutAction: () => Promise<void>;
  isAdmin?: boolean;
  lockedUsersCount?: number;
}

export function SideMenuMobile({
  open,
  toggleDrawer,
  user,
  signOutAction,
  isAdmin,
  lockedUsersCount = 0,
}: SideMenuMobileProps) {
  return (
    <MuiDrawer
      anchor="right"
      open={open}
      onClose={toggleDrawer(false)}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        [`& .${drawerClasses.paper}`]: {
          backgroundImage: "none",
          backgroundColor: "background.paper",
        },
      }}
    >
      <Stack sx={{ maxWidth: "70dvw", height: "100%" }}>
        <SidebarContent
          user={user}
          signOutAction={signOutAction}
          isAdmin={isAdmin}
          lockedUsersCount={lockedUsersCount}
        />
      </Stack>
    </MuiDrawer>
  );
}

// ── Sidebar (desktop permanent drawer) ────────────────────────────────────────

interface SidebarProps {
  user: { name: string; email: string };
  signOutAction: () => Promise<void>;
  isAdmin?: boolean;
  lockedUsersCount?: number;
}

export default function Sidebar({
  user,
  signOutAction,
  isAdmin,
  lockedUsersCount = 0,
}: SidebarProps) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: "none", md: "block" },
        [`& .${drawerClasses.paper}`]: {
          backgroundColor: "background.paper",
        },
      }}
    >
      <SidebarContent
        user={user}
        signOutAction={signOutAction}
        isAdmin={isAdmin}
        lockedUsersCount={lockedUsersCount}
      />
    </Drawer>
  );
}
