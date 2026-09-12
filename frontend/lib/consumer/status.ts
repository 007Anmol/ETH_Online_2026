import type { ProductCategory } from "@verichain/shared";
import type {
  ConsumerVerificationStatus,
  GrievanceCategory,
  GrievanceStatus,
  ListingStatus,
  TransferRecordStatus,
} from "@/lib/consumer/types";

/**
 * Purely decorative per-category color, used only on the marketplace to make
 * listing cards easier to scan at a glance. Not a semantic status signal.
 */
export const CATEGORY_ACCENT: Record<ProductCategory, string> = {
  WATCHES: "border-violet-500/20 bg-violet-500/[0.07] text-violet-600",
  APPAREL: "border-amber-500/20 bg-amber-500/[0.07] text-amber-600",
  BAGS: "border-rose-500/20 bg-rose-500/[0.07] text-rose-600",
  SHOES: "border-sky-500/20 bg-sky-500/[0.07] text-sky-600",
};

/**
 * Single source of truth for how a verification status is presented. The
 * landing page has no semantic color tokens (`--success`/`--warning`/etc) —
 * it inlines emerald/amber/red Tailwind classes directly (see TrustSection's
 * anomaly card, ProductIdentity's "Identity verified" dot). This mirrors that
 * convention instead of introducing a parallel token system.
 */
export const STATUS_PRESENTATION: Record<
  ConsumerVerificationStatus,
  {
    label: string;
    dotClassName: string;
    badgeClassName: string;
    description: string;
  }
> = {
  VERIFIED: {
    label: "Verified",
    dotClassName: "bg-emerald-500",
    badgeClassName: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-600",
    description: "This product's identity and history are confirmed on-chain.",
  },
  INCOMPLETE: {
    label: "Incomplete record",
    dotClassName: "bg-amber-500",
    badgeClassName: "border-amber-500/20 bg-amber-500/[0.06] text-amber-600",
    description: "Part of this product's supply chain record is missing.",
  },
  SUSPICIOUS: {
    label: "Suspicious",
    dotClassName: "bg-red-500",
    badgeClassName: "border-red-500/20 bg-red-500/[0.06] text-red-600",
    description: "This product's record does not match its manufacturer.",
  },
  NOT_FOUND: {
    label: "Not found",
    dotClassName: "bg-[var(--muted)]",
    badgeClassName: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]",
    description: "No product matches this ID.",
  },
};

export const GRIEVANCE_STATUS_PRESENTATION: Record<
  GrievanceStatus,
  { label: string; dotClassName: string; badgeClassName: string }
> = {
  open: {
    label: "Open",
    dotClassName: "bg-amber-500",
    badgeClassName: "border-amber-500/20 bg-amber-500/[0.06] text-amber-600",
  },
  under_review: {
    label: "Under review",
    dotClassName: "bg-blue-500",
    badgeClassName: "border-blue-500/20 bg-blue-500/[0.06] text-blue-600",
  },
  resolved: {
    label: "Resolved",
    dotClassName: "bg-emerald-500",
    badgeClassName: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-600",
  },
  rejected: {
    label: "Rejected",
    dotClassName: "bg-red-500",
    badgeClassName: "border-red-500/20 bg-red-500/[0.06] text-red-600",
  },
};

export const GRIEVANCE_CATEGORY_LABELS: Record<GrievanceCategory, string> = {
  counterfeit_suspicion: "Suspected counterfeit",
  damaged_product: "Damaged product",
  missing_history: "Missing history / provenance",
  ownership_dispute: "Ownership dispute",
  other: "Other issue",
};

export const LISTING_STATUS_PRESENTATION: Record<
  ListingStatus,
  { label: string; dotClassName: string; badgeClassName: string }
> = {
  active: {
    label: "Listed",
    dotClassName: "bg-emerald-500",
    badgeClassName: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-600",
  },
  sold: {
    label: "Sold",
    dotClassName: "bg-[var(--muted)]",
    badgeClassName: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]",
  },
  cancelled: {
    label: "Cancelled",
    dotClassName: "bg-[var(--muted)]",
    badgeClassName: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]",
  },
};

export const TRANSFER_STATUS_PRESENTATION: Record<
  TransferRecordStatus,
  { label: string; dotClassName: string; badgeClassName: string }
> = {
  pending: {
    label: "Pending",
    dotClassName: "bg-amber-500",
    badgeClassName: "border-amber-500/20 bg-amber-500/[0.06] text-amber-600",
  },
  confirmed: {
    label: "Confirmed",
    dotClassName: "bg-emerald-500",
    badgeClassName: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-600",
  },
  failed: {
    label: "Failed",
    dotClassName: "bg-red-500",
    badgeClassName: "border-red-500/20 bg-red-500/[0.06] text-red-600",
  },
};
