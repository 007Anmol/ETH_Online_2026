"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tag } from "lucide-react";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { EmptyState } from "@/components/consumer/states/EmptyState";

type Listing = {
  id: string;
  product_id: string;
  productCode: string | null;
  seller_wallet_address: string;
  created_at: string;
};

export function MarketplaceBrowser() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/consumer/marketplace/listings")
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.error) setError(body.error);
        else setListings(body.listings ?? []);
      })
      .catch(() => !cancelled && setError("Could not load listings"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="mt-6 text-sm text-red-600">{error}</p>;
  }
  if (listings === null) {
    return <div className="mt-6"><LoadingState label="Loading listings" /></div>;
  }
  if (listings.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState icon={Tag} title="No active listings" description="Nobody has listed a product for resale yet." />
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-3">
      {listings.map((listing) => (
        <Link
          key={listing.id}
          href={`/consumer/hedera-marketplace/${listing.product_id}`}
          className="vc-card flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {listing.productCode ?? listing.product_id}
            </p>
            <p className="mt-1 font-mono text-xs text-[var(--muted)]">
              Seller {listing.seller_wallet_address}
            </p>
          </div>
          <Tag size={16} className="text-[var(--vc-accent)]" />
        </Link>
      ))}
    </div>
  );
}
