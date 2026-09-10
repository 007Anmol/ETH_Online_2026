"use client";

import { Check } from "lucide-react";
import { HeroTrustBadge } from "@/components/consumer/three/HeroTrustBadge";

/**
 * Home's hero visual: one large 3D trust seal, with a short caption below
 * it rather than floating data cards competing for attention.
 */
export function HeroPreviewCards() {
  return (
    <div className="mx-auto hidden w-full max-w-lg flex-col items-center lg:flex">
      <HeroTrustBadge className="h-[480px] w-full" />

      <div className="-mt-6 flex flex-col items-center gap-2 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--vc-accent)]/30 bg-[var(--vc-accent-soft)] px-3 py-1 text-[11px] font-medium text-[var(--vc-accent)]">
          <Check size={12} strokeWidth={2.5} />
          Verified
        </span>
        <p className="max-w-xs text-sm text-[var(--muted)]">
          One seal, every time a product checks out.
        </p>
      </div>
    </div>
  );
}
