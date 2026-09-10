"use client";

import { Package, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/consumer/states/EmptyState";
import { ErrorState } from "@/components/consumer/states/ErrorState";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { VerificationBadge } from "@/components/consumer/VerificationBadge";
import { useConsumerIdentity } from "@/lib/consumer/hooks/use-consumer-identity";
import { useOwnedProducts } from "@/lib/consumer/hooks/use-owned-products";

export function OwnedProductsPreview() {
  const { identity, status: identityStatus } = useConsumerIdentity();
  const { products, status: productsStatus, refresh } = useOwnedProducts();

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto w-full max-w-3xl px-6 lg:px-10">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            Your products
          </p>
          <h2 className="mt-4 text-3xl font-medium leading-[1.05] tracking-[-0.04em] lg:text-4xl">
            What you own.
          </h2>
        </div>

        <div className="mt-12">
          {identityStatus === "checking" ? (
            <LoadingState label="Checking your sign-in status" />
          ) : !identity ? (
            <EmptyState
              icon={Package}
              title="Sign in to see your products"
              description="Your verified products and ownership history are tied to your VeriChain sign-in."
              action={
                <Button href="/consumer/login" className="mt-2">
                  Sign in
                </Button>
              }
            />
          ) : productsStatus === "loading" ? (
            <LoadingState label="Loading your products" />
          ) : productsStatus === "error" ? (
            <ErrorState
              description="We couldn't load your products right now."
              onRetry={refresh}
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon={ScanLine}
              title="No products yet"
              description="Scan your first product to verify and claim it."
              action={
                <Button href="/consumer/scan" className="mt-2">
                  Scan Product
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {products.slice(0, 2).map((owned) => (
                <div
                  key={owned.productId}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[var(--muted)]">
                      {owned.productId}
                    </span>
                    <VerificationBadge outcome={owned.verification} />
                  </div>
                  <h3 className="mt-3 text-sm font-medium text-[var(--foreground)]">
                    {owned.name}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Claimed {new Date(owned.claimedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
