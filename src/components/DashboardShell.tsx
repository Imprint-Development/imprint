"use client";

import * as React from "react";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Sidebar, { SideMenuMobile } from "@/components/Sidebar";
import Header from "@/components/Header";
import { CourseProvider, type CourseOption } from "@/components/CourseProvider";

interface DashboardShellProps {
  user: { name: string; email: string; isAdmin: boolean };
  signOutAction: () => Promise<void>;
  courses: CourseOption[];
  children: React.ReactNode;
}

export default function DashboardShell({
  user,
  signOutAction,
  courses,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const toggleDrawer = (open: boolean) => () => setMobileOpen(open);

  return (
    <CourseProvider courses={courses}>
      <Box sx={{ display: "flex" }}>
        <Sidebar
          user={user}
          signOutAction={signOutAction}
          isAdmin={user.isAdmin}
        />
        <Header onMenuClick={toggleDrawer(true)} />
        <SideMenuMobile
          open={mobileOpen}
          toggleDrawer={toggleDrawer}
          user={user}
          signOutAction={signOutAction}
          isAdmin={user.isAdmin}
        />
        {/* Main content */}
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1,
            backgroundColor: theme.vars
              ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
              : alpha(theme.palette.background.default, 1),
            overflow: "auto",
          })}
        >
          <Box
            sx={{
              mx: { xs: 2, md: 3 },
              pb: 5,
              mt: { xs: 8, md: 0 },
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </CourseProvider>
  );
}
