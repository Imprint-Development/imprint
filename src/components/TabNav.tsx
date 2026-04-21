"use client";

import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export interface TabDef {
  label: string;
  value: string;
}

interface TabNavProps {
  tabs: TabDef[];
  defaultTab?: string;
  /** searchParam key, defaults to "tab" */
  param?: string;
}

export default function TabNav({
  tabs,
  defaultTab,
  param = "tab",
}: TabNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get(param) ?? defaultTab ?? tabs[0]?.value;

  const handleChange = useCallback(
    (_: React.SyntheticEvent, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(param, value);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, param]
  );

  return (
    <Tabs
      value={current}
      onChange={handleChange}
      sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
    >
      {tabs.map((t) => (
        <Tab key={t.value} label={t.label} value={t.value} />
      ))}
    </Tabs>
  );
}
