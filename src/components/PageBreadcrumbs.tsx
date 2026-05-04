"use client";

import { styled } from "@mui/material/styles";
import Breadcrumbs, { breadcrumbsClasses } from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import AppLink from "@/components/AppLink";

export interface BreadcrumbItem {
  label: string;
  /** If omitted, the item renders as plain text (current page). */
  href?: string;
}

const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0, 2),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: "center",
  },
}));

interface PageBreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Shared breadcrumb component using the MUI dashboard template style.
 * Always prepends a "Home" link. The last item in `items` should have no
 * `href` (it represents the current page).
 */
export default function PageBreadcrumbs({ items }: PageBreadcrumbsProps) {
  const allItems: BreadcrumbItem[] = [
    { label: "Home", href: "/dashboard" },
    ...items,
  ];

  return (
    <StyledBreadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextRoundedIcon fontSize="small" />}
    >
      {allItems.map((item, i) => {
        const isLast = i === allItems.length - 1;
        return item.href && !isLast ? (
          <AppLink key={i} href={item.href}>
            <Typography variant="body1">{item.label}</Typography>
          </AppLink>
        ) : (
          <Typography
            key={i}
            variant="body1"
            sx={{ color: "text.primary", fontWeight: 600 }}
          >
            {item.label}
          </Typography>
        );
      })}
    </StyledBreadcrumbs>
  );
}
