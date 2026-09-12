"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Ban, Sparkles, Store, Tag } from "lucide-react";
import { productCategoryLabel } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import { CATEGORY_ACCENT, LISTING_STATUS_PRESENTATION } from "@/lib/consumer/status";
import { marketplaceProvider } from "@/lib/consumer/registry";
import { EmptyState } from "@/components/consumer/states/EmptyState";
import type { MarketplaceListing } from "@/lib/consumer/types";

type Tab = "browse" | "mine";

function ListingCard({
  listing,
  index,
  onCancel,
}: {
  listing: MarketplaceListing;
  index: number;
  onCancel?: (listingId: string) => void;
}) {
  const presentation = LISTING_STATUS_PRESENTATION[listing.status];
  const categoryAccent = CATEGORY_ACCENT[listing.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="card-hover group relative border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <Link href={`/consumer/marketplace/${listing.listingId}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] transition-transform duration-300 group-hover:scale-110 group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
            <Tag size={16} />
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${presentation.badgeClassName}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${presentation.dotClassName}`} />
            {presentation.label}
          </span>
        </div>

        <p className="mt-4 text-sm font-medium">{listing.name}</p>
        <p className="mt-1 font-mono text-xs text-[var(--muted)]">{listing.productCode}</p>
        <span
          className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${categoryAccent}`}
        >
          {productCategoryLabel(listing.category)}
        </span>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
          <p className="gradient-text text-base font-semibold">{formatUsd(listing.priceUsd)}</p>
          <p className="text-xs text-[var(--muted)]">
            {listing.mine ? "Your listing" : `Sold by ${listing.sellerDisplayName}`}
          </p>
        </div>
      </Link>

      {listing.mine && listing.status === "active" && onCancel ? (
        <button
          type="button"
          onClick={() => onCancel(listing.listingId)}
          className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-full border border-[var(--border)] text-xs font-medium text-[var(--muted)] transition-colors hover:border-red-400 hover:text-red-500"
        >
          <Ban size={12} />
          Cancel listing
        </button>
      ) : null}
    </motion.div>
  );
}

export function MarketplaceBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab: Tab = searchParams.get("tab") === "mine" ? "mine" : "browse";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [browse, setBrowse] = useState<MarketplaceListing[] | null>(null);
  const [mine, setMine] = useState<MarketplaceListing[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void marketplaceProvider.listActiveListings().then((result) => {
      if (!cancelled) setBrowse(result);
    });
    void marketplaceProvider.listMyListings().then((result) => {
      if (!cancelled) setMine(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function selectTab(next: Tab) {
    setTab(next);
    router.replace(next === "mine" ? "/consumer/marketplace?tab=mine" : "/consumer/marketplace");
  }

  async function cancelListing(listingId: string) {
    setMine((current) =>
      current
        ? current.map((entry) =>
            entry.listingId === listingId ? { ...entry, status: "cancelled" } : entry,
          )
        : current,
    );
    await marketplaceProvider.cancelListing(listingId);
  }

  const activeList = tab === "browse" ? browse : mine;

  return (
    <div className="mt-8">
      <div className="relative inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
        {(["browse", "mine"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => selectTab(value)}
            className={`relative h-9 rounded-full px-4 text-sm font-medium transition-colors ${
              tab === value ? "text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab === value ? (
              <motion.span
                layoutId="marketplace-tab-active"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 -z-10 rounded-full"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))" }}
              />
            ) : null}
            {value === "browse" ? "Browse" : "My listings"}
          </button>
        ))}
      </div>

      {activeList === null ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="h-40 animate-pulse border border-[var(--border)] bg-[var(--surface-muted)]"
            />
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <div className="mt-6">
          {tab === "browse" ? (
            <EmptyState
              icon={Store}
              title="No listings yet"
              description="Nobody has listed a product for resale yet. Check back soon."
            />
          ) : (
            <EmptyState
              icon={Tag}
              title="You haven't listed anything"
              description="List a product from My Products to sell it to another consumer."
              action={
                <Link
                  href="/consumer/products"
                  className="btn-accent inline-flex h-10 items-center rounded-full px-5 text-sm font-medium"
                >
                  Go to my products
                </Link>
              }
            />
          )}
        </div>
      ) : (
        <>
          {tab === "browse" ? (
            <div className="mt-6 flex items-center gap-2 text-xs text-[var(--muted)]">
              <Sparkles size={13} style={{ color: "var(--accent)" }} />
              Every listing below is a verified product with an on-chain history.
            </div>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeList.map((listing, index) => (
              <ListingCard
                key={listing.listingId}
                listing={listing}
                index={index}
                onCancel={tab === "mine" ? cancelListing : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
