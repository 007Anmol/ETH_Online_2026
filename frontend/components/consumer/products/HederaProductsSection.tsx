"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallets } from "@privy-io/react-auth";
import { ArrowLeftRight, MessageSquareWarning, Tag } from "lucide-react";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { EmptyState } from "@/components/consumer/states/EmptyState";

type HederaProduct = { productId: string; productCode: string; ownerWalletAddress: string };

/**
 * Real, on-chain-backed products — separate from the mock demo catalog
 * above. Each card links to the real Transfer/Resell/Report pages
 * (lib/consumer/adapters/*, app/api/consumer/**), wired to the deployed
 * VeriChainConsumerNFT/VeriChainMarketplace contracts on Hedera testnet.
 */
export function HederaProductsSection() {
  const { wallets } = useWallets();
  const myWallet = wallets[0]?.address?.toLowerCase();
  const [products, setProducts] = useState<HederaProduct[] | null>(null);

  useEffect(() => {
    fetch("/api/consumer/hedera-products")
      .then((res) => res.json())
      .then((body) => setProducts(body.products ?? []));
  }, []);

  return (
    <div className="mt-14">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--vc-accent)]" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          Real Hedera testnet products
        </p>
      </div>
      <p className="mt-2 max-w-lg text-sm text-[var(--muted)]">
        These are backed by a real deployed contract, not the demo catalog above —
        transfer and resale here submit real, wallet-signed Hedera transactions.
      </p>

      <div className="mt-5">
        {products === null ? (
          <LoadingState label="Loading Hedera products" />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No on-chain products yet"
            description="Ask for a demo product to be minted to your wallet to try this out."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((product) => {
              const isMine = myWallet && product.ownerWalletAddress.toLowerCase() === myWallet;
              return (
                <div
                  key={product.productId}
                  className="vc-card rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">{product.productCode}</p>
                  <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                    Owner {product.ownerWalletAddress}
                    {isMine ? <span className="ml-1.5 text-[var(--vc-accent)]">(you)</span> : null}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href={`/consumer/hedera-transfer/${product.productId}`}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] text-xs font-medium transition-colors hover:border-[var(--vc-accent)] hover:text-[var(--vc-accent)]"
                    >
                      <ArrowLeftRight size={13} />
                      Transfer
                    </Link>
                    <Link
                      href={`/consumer/hedera-resell/${product.productId}`}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] text-xs font-medium transition-colors hover:border-[var(--vc-accent)] hover:text-[var(--vc-accent)]"
                    >
                      <Tag size={13} />
                      Resell
                    </Link>
                    <Link
                      href={`/consumer/hedera-grievances/new/${product.productId}`}
                      aria-label="Report an issue"
                      title="Report an issue"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] transition-colors hover:border-red-400 hover:text-red-500"
                    >
                      <MessageSquareWarning size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link
        href="/consumer/hedera-marketplace"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--vc-accent)] hover:underline"
      >
        <Tag size={13} />
        Browse the Hedera marketplace
      </Link>
    </div>
  );
}
