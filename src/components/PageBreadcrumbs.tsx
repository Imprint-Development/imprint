import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import AppLink from "@/components/AppLink";

export interface BreadcrumbItem {
  label: string;
  /** If omitted, the item renders as plain text (current page). */
  href?: string;
}

interface PageBreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Shared breadcrumb component.
 * Always prepends a "Home" link.  The last item in `items` should have no
 * `href` (it represents the current page).
 */
export default function PageBreadcrumbs({ items }: PageBreadcrumbsProps) {
  return (
    <Breadcrumbs sx={{ mb: 2 }}>
      <AppLink href="/dashboard">Home</AppLink>
      {items.map((item, i) =>
        item.href ? (
          <AppLink key={i} href={item.href}>
            {item.label}
          </AppLink>
        ) : (
          <Typography key={i} color="text.primary">
            {item.label}
          </Typography>
        )
      )}
    </Breadcrumbs>
  );
}
