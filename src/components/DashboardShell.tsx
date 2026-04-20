"use client";

import * as React from "react";
import Box from "@mui/joy/Box";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

interface DashboardShellProps {
  user: { name: string; email: string };
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}

export default function DashboardShell({
  user,
  signOutAction,
  children,
}: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <Sidebar
        user={user}
        signOutAction={signOutAction}
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
  );
}
