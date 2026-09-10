"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScanLine, Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductCollectionCard } from "@/components/consumer/products/ProductCollectionCard";
import { StatCounter } from "@/components/consumer/StatCounter";
import { EmptyState } from "@/components/consumer/states/EmptyState";
import { ErrorState } from "@/components/consumer/states/ErrorState";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { useConsumerIdentity } from "@/lib/consumer/hooks/use-consumer-identity";
import { useProductCollection } from "@/lib/consumer/hooks/use-product-collection";

type Filter = "all" | "verified" | "recent";

const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export function ProductCollectionGrid() {
  const { identity, status: identityStatus } = useConsumerIdentity();
  const { items, status, refresh } = useProductCollection();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const gridRef = useRef<HTMLDivElement>(null);

  const manufacturerCount = useMemo(() => {
    const names = new Set(items.map((item) => item.product?.manufacturerName).filter(Boolean));
    return names.size;
  }, [items]);

  const visible = useMemo(() => {
    const now = Date.now();
    return items.filter((item) => {
      if (filter === "verified" && item.verification !== "VERIFIED") return false;
      if (filter === "recent" && now - new Date(item.claimedAt).getTime() > RECENT_WINDOW_MS) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.productId.toLowerCase().includes(q) ||
        (item.product?.manufacturerName ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = grid.querySelectorAll("[data-collection-card]");
    if (cards.length === 0) return;

    if (reduceMotion) {
      gsap.set(cards, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    const tween = gsap.fromTo(
      cards,
      { opacity: 0, y: 16, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out", stagger: 0.06 },
    );

    return () => {
      tween.kill();
    };
  }, [visible]);

  if (identityStatus === "checking") {
    return <LoadingState label="Checking your sign-in status" />;
  }

  if (!identity) {
    return (
      <div className="flex justify-center">
        <EmptyState
          icon={Package}
          title="Sign in to view products"
          description="Sign in to view products and manage your verified collection."
          action={
            <Button href="/consumer/login" className="mt-2">
              Sign in
            </Button>
          }
        />
      </div>
    );
  }

  if (status === "loading") {
    return <LoadingState label="Loading your products" />;
  }

  if (status === "error") {
    return (
      <ErrorState
        description="We couldn't load your products right now."
        onRetry={refresh}
      />
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex justify-center">
        <EmptyState
          icon={ScanLine}
          title="Your collection is empty"
          description="Products you claim will appear here."
          action={
            <Button href="/consumer/scan" className="mt-2">
              Scan a product
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-8">
        <div>
          <StatCounter
            value={items.length}
            className="text-2xl font-medium tracking-[-0.02em] text-[var(--foreground)]"
          />
          <p className="text-xs text-[var(--muted)]">
            Verified product{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <div>
          <StatCounter
            value={manufacturerCount}
            className="text-2xl font-medium tracking-[-0.02em] text-[var(--foreground)]"
          />
          <p className="text-xs text-[var(--muted)]">
            Manufacturer{manufacturerCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, ID, or manufacturer"
          className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none transition-all duration-200 focus:border-[var(--vc-accent)] focus:shadow-[0_0_0_4px_var(--vc-accent-soft)] sm:max-w-xs"
        />

        <div className="flex items-center gap-2">
          {(
            [
              { key: "all", label: "All" },
              { key: "verified", label: "Verified" },
              { key: "recent", label: "Recently claimed" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === key
                  ? "border-[var(--vc-accent)] bg-[var(--vc-accent-soft)] text-[var(--vc-accent)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No matching products"
          description="Try a different search term or filter."
        />
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <div key={item.productId} data-collection-card className="h-full">
              <ProductCollectionCard item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
