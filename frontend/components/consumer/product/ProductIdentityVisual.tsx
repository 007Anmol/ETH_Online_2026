import { Watch, Footprints, ShoppingBag, Shirt, Package, type LucideIcon } from "lucide-react";
import type { ProductCategory } from "@/lib/types";

const CATEGORY_ICONS: Record<ProductCategory, LucideIcon> = {
  WATCHES: Watch,
  SHOES: Footprints,
  BAGS: ShoppingBag,
  APPAREL: Shirt,
};

/**
 * No product photography exists in this data model, so this is an
 * intentional identity mark — not a placeholder pretending to be a photo.
 * A restrained dot-grid + the category icon, in the same monochrome
 * language as the rest of the consumer UI.
 */
export function ProductIdentityVisual({ category }: { category: ProductCategory | null }) {
  const Icon = category ? CATEGORY_ICONS[category] : Package;

  return (
    <div className="relative flex aspect-square w-full max-w-xs items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full text-[var(--border)]"
        preserveAspectRatio="xMidYMid slice"
      >
        <pattern id="identity-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#identity-dots)" />
      </svg>

      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
        <Icon size={32} strokeWidth={1.25} className="text-[var(--foreground)]" />
      </div>
    </div>
  );
}
