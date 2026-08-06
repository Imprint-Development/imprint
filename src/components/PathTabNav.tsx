"use client";

import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

interface TabDef {
  label: string;
  href: string;
}

export default function PathTabNav({ tabs }: { tabs: TabDef[] }) {
  const pathname = usePathname();

  // Exact match first, then prefix match (for nested routes), then fallback to first tab
  const current =
    tabs.find((t) => pathname === t.href)?.href ??
    tabs.find((t) => pathname.startsWith(t.href + "/"))?.href ??
    tabs[0]?.href;

  return (
    <Tabs
      value={current}
      sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
    >
      {tabs.map((t) => (
        <Tab
          key={t.href}
          label={t.label}
          value={t.href}
          component={NextLink}
          href={t.href}
        />
      ))}
    </Tabs>
  );
}
