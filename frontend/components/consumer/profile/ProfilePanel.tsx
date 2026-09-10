"use client";

import { useRouter } from "next/navigation";
import { Copy, LogOut, Package, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/consumer/states/EmptyState";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { RevealGroup } from "@/components/consumer/RevealGroup";
import { useConsumerIdentity } from "@/lib/consumer/hooks/use-consumer-identity";
import { useOwnedProducts } from "@/lib/consumer/hooks/use-owned-products";
import { truncateMiddle } from "@/lib/consumer/format";

const METHOD_LABEL: Record<string, string> = {
  GOOGLE: "Google",
  EMAIL: "email",
  WALLET: "wallet",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function ProfilePanel() {
  const router = useRouter();
  const { identity, status, logout } = useConsumerIdentity();
  const { products, status: productsStatus } = useOwnedProducts();

  async function handleSignOut() {
    await logout();
    router.push("/consumer/login");
  }

  function copyWallet(address: string) {
    void navigator.clipboard.writeText(address);
    toast.success("Wallet address copied");
  }

  if (status === "checking") {
    return <LoadingState label="Checking your sign-in status" />;
  }

  if (!identity) {
    return (
      <div className="flex justify-center">
        <EmptyState
          icon={ShieldCheck}
          title="Sign in to view your profile"
          description="Your VeriChain identity, wallet, and collection live here once you're signed in."
          action={
            <Button href="/consumer/login" className="mt-2">
              Sign in
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <RevealGroup className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div data-reveal className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] text-lg font-medium text-[var(--foreground)]">
          {initials(identity.displayName) || "VC"}
        </div>
        <h1 className="mt-4 text-lg font-medium tracking-[-0.02em] text-[var(--foreground)]">
          {identity.displayName}
        </h1>
        <p className="mt-1 text-xs text-[var(--muted)]">Verified consumer</p>
      </div>

      <div data-reveal className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Wallet</p>
        {identity.walletAddress ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="font-mono text-sm text-[var(--foreground)]">
              {truncateMiddle(identity.walletAddress, 8, 6)}
            </span>
            <button
              type="button"
              onClick={() => copyWallet(identity.walletAddress!)}
              aria-label="Copy wallet address"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--vc-accent)] hover:text-[var(--vc-accent)]"
            >
              <Copy size={14} strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">Not available</p>
        )}
      </div>

      <div data-reveal className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Products</p>
            <p className="mt-1 text-sm text-[var(--foreground)]">
              {productsStatus === "loading" ? "Loading…" : `${products.length} verified`}
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)]">
            <Package size={16} strokeWidth={1.5} />
          </span>
        </div>
        <Button href="/consumer/products" variant="secondary" className="mt-4 w-full justify-center">
          View My Products
        </Button>
      </div>

      <div data-reveal className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Account</p>
        <p className="mt-2 text-sm text-[var(--foreground)]">
          Signed in with {METHOD_LABEL[identity.loginMethod] ?? identity.loginMethod.toLowerCase()}
        </p>
        <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--muted)]">
          Your VeriChain identity is used to associate verified products with you.
        </p>
      </div>

      <button
        type="button"
        data-reveal
        onClick={handleSignOut}
        className="mx-auto inline-flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--vc-danger)] hover:text-[var(--vc-danger)]"
      >
        <LogOut size={14} strokeWidth={1.75} />
        Sign out
      </button>
    </RevealGroup>
  );
}
