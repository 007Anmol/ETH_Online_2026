"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Copy, LogOut, Package, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { RevealGroup } from "@/components/consumer/RevealGroup";
import { StatCounter } from "@/components/consumer/StatCounter";
import { truncateMiddle } from "@/lib/consumer/format";

type HederaProduct = { productId: string; productCode: string; ownerWalletAddress: string };

/**
 * Real profile view — the connected Hedera wallet address and the real
 * products it owns (same /api/consumer/hedera-products source My Products
 * uses), replacing the old mock-identity ProfilePanel for this route. No
 * fabricated stats: "Products owned" is a live count of real
 * ownership_records rows for this exact wallet.
 */
export function HederaProfilePanel() {
  const router = useRouter();
  const { logout } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const [allProducts, setAllProducts] = useState<HederaProduct[] | null>(null);

  useEffect(() => {
    fetch("/api/consumer/hedera-products")
      .then((res) => res.json())
      .then((body) => setAllProducts(body.products ?? []));
  }, []);

  function copyWallet(address: string) {
    void navigator.clipboard.writeText(address);
    toast.success("Wallet address copied");
  }

  async function handleSignOut() {
    await fetch("/api/consumer/auth/logout", { method: "POST" });
    await logout();
    router.push("/consumer");
  }

  if (!wallet) {
    return (
      <div className="flex justify-center">
        <div className="vc-card vc-neon-panel flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <ShieldCheck size={22} strokeWidth={1.5} className="text-[var(--muted)]" />
          <h3 className="text-sm font-medium text-[var(--foreground)]">Connect your wallet</h3>
          <p className="max-w-xs text-sm leading-6 text-[var(--muted)]">
            Your real Hedera wallet and verified product collection show up here once it's
            connected.
          </p>
        </div>
      </div>
    );
  }

  const owned = allProducts?.filter((p) => p.ownerWalletAddress.toLowerCase() === wallet.address.toLowerCase()) ?? null;

  return (
    <RevealGroup className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div data-reveal className="vc-card vc-neon-panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] text-[var(--vc-accent)] shadow-[0_0_0_6px_var(--vc-accent-soft)]">
          <Wallet size={24} strokeWidth={1.75} />
        </div>
        <h1 className="vc-neon-text mt-4 text-lg font-medium tracking-[-0.02em]">
          Real Hedera wallet
        </h1>
        <p className="mt-1 text-xs text-[var(--muted)]">Connected via MetaMask</p>
      </div>

      <div data-reveal className="vc-card vc-neon-panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Wallet address</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-mono text-sm text-[var(--foreground)]">
            {truncateMiddle(wallet.address, 8, 6)}
          </span>
          <button
            type="button"
            onClick={() => copyWallet(wallet.address)}
            aria-label="Copy wallet address"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--vc-accent)] hover:text-[var(--vc-accent)]"
          >
            <Copy size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div data-reveal className="vc-card vc-neon-panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">
              Products owned
            </p>
            {owned === null ? (
              <p className="mt-1 text-sm text-[var(--foreground)]">Loading…</p>
            ) : (
              <div className="mt-1 flex items-baseline gap-1.5">
                <StatCounter
                  value={owned.length}
                  className="text-lg font-medium tracking-[-0.02em] text-[var(--foreground)]"
                />
                <span className="text-sm text-[var(--muted)]">on-chain</span>
              </div>
            )}
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)]">
            <Package size={16} strokeWidth={1.5} />
          </span>
        </div>
        <Button href="/consumer/products" variant="secondary" className="mt-4 w-full justify-center">
          View My Products
        </Button>
      </div>

      <button
        type="button"
        data-reveal
        onClick={() => void handleSignOut()}
        className="mx-auto inline-flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--vc-danger)] hover:text-[var(--vc-danger)]"
      >
        <LogOut size={14} strokeWidth={1.75} />
        Disconnect wallet
      </button>
    </RevealGroup>
  );
}
