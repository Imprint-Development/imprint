/**
 * Shared constants used across multiple pages/components.
 */

export const CHECKPOINT_STATUS_COLOR = {
  pending: "warning",
  analyzing: "primary",
  complete: "success",
  failed: "error",
} as const satisfies Record<
  string,
  "warning" | "primary" | "success" | "error"
>;
