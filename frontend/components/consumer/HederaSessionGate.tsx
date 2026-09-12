"use client";

import type { ReactNode } from "react";
import { useConnectWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { Wallet } from "lucide-react";
import { useHederaSession } from "@/lib/consumer/hooks/use-hedera-session";

/**
 * Gates real Hedera actions behind an actual signed-in consumer session —
 * connecting a wallet alone is NOT enough (that only lets you sign
 * transactions; the backend's requireConsumer() also needs a real session
 * cookie, established by signing a challenge message). Renders children
 * (with the connected wallet + session) once both are true.
 */
export function HederaSessionGate({
  children,
}: {
  children: (wallet: ReturnType<typeof useWallets>["wallets"][number]) => ReactNode;
}) {
  const { ready, authenticated } = usePrivy();
  const { connectWallet } = useConnectWallet();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const { status, error, signIn } = useHederaSession();

  if (!ready) return null;

  if (!authenticated || !wallet) {
    return (
      <button
        type="button"
        onClick={() => connectWallet()}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--vc-accent)] text-sm font-medium text-white"
      >
        <Wallet size={16} />
        Connect wallet
      </button>
    );
  }

  if (status === "checking") return null;

  if (status !== "signed_in") {
    return (
      <div className="mt-6">
        <button
          type="button"
          disabled={status === "signing_in"}
          onClick={() => void signIn(wallet)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--vc-accent)] text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "signing_in" ? "Waiting for signature…" : "Sign in with wallet"}
        </button>
        <p className="mt-2 text-xs text-[var(--muted)]">
          One signature to prove you control this wallet — separate from the transaction
          signature itself.
        </p>
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  return <>{children(wallet)}</>;
}
