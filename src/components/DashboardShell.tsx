"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { CourseProvider, type CourseOption } from "@/components/CourseProvider";
import CourseSelectModal from "@/components/CourseSelectModal";

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
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <CourseProvider courses={courses}>
      <Box sx={{ display: "flex", height: "100dvh", overflow: "hidden" }}>
        <Sidebar
          user={user}
          signOutAction={signOutAction}
          isAdmin={user.isAdmin}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
        <Box
          component="main"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            gap: 1,
            overflow: "auto",
          }}
        >
          <Header onMenuClick={() => setDrawerOpen(true)} />
          <Box
            sx={{
              flex: 1,
              p: 3,
              pt: { xs: "calc(var(--Header-height, 52px) + 24px)", md: 3 },
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
      <CourseSelectModal />
    </CourseProvider>
  );
}
