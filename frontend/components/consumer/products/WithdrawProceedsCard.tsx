"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { Check, ExternalLink, TriangleAlert, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getPendingWithdrawalClient } from "@/lib/consumer/chain/reads";
import { tinybarsToHbarString } from "@/lib/consumer/chain/hbar-units";
import { useWithdrawProceeds } from "@/lib/consumer/hooks/use-withdraw-proceeds";
import type { WithdrawState } from "@/lib/consumer/hooks/use-withdraw-proceeds";
import type { EthereumWalletLike } from "@/lib/consumer/chain/hedera-wallet-client";
import { TransactionSteps } from "@/components/consumer/transaction/TransactionSteps";
import type { TransactionStepsStatus } from "@/components/consumer/transaction/TransactionSteps";

const STEPS = ["Sign withdrawal", "Confirm on Hedera"];

function progressFor(state: WithdrawState): { activeIndex: number; status: TransactionStepsStatus } | null {
  switch (state) {
    case "AWAITING_SIGNATURE":
      return { activeIndex: 0, status: "progress" };
    case "SUBMITTED":
    case "CONFIRMING_ON_HEDERA":
      return { activeIndex: 1, status: "progress" };
    case "WITHDRAWN":
      return { activeIndex: 1, status: "done" };
    case "SIGNATURE_REJECTED":
    case "WRONG_NETWORK":
      return { activeIndex: 0, status: "failed" };
    case "TRANSACTION_REVERTED":
    case "TRANSACTION_FAILED":
      return { activeIndex: 1, status: "failed" };
    default:
      return null;
  }
}

const STATE_LABEL: Record<WithdrawState, string> = {
  IDLE: "Withdraw",
  AWAITING_SIGNATURE: "Waiting for wallet signature…",
  SUBMITTED: "Withdrawal submitted",
  CONFIRMING_ON_HEDERA: "Confirming on Hedera…",
  WITHDRAWN: "Withdrawn",
  SIGNATURE_REJECTED: "Signature rejected",
  TRANSACTION_REVERTED: "Transaction reverted",
  TRANSACTION_FAILED: "Withdrawal failed",
  WRONG_NETWORK: "Wrong network",
};

const FAILURE_STATES = new Set<WithdrawState>([
  "SIGNATURE_REJECTED",
  "TRANSACTION_REVERTED",
  "TRANSACTION_FAILED",
  "WRONG_NETWORK",
]);

/**
 * Sale proceeds a connected wallet has been credited (via completed
 * marketplace sales) but hasn't yet claimed. Reads `pendingWithdrawals`
 * directly from the contract — this is real HBAR sitting in escrow, not an
 * app balance — and lets the seller pull it with `withdraw()`.
 */
export function WithdrawProceedsCard() {
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const [balanceTinybars, setBalanceTinybars] = useState<bigint | null>(null);
  const { state, txHash, error, withdraw } = useWithdrawProceeds();

  const refreshBalance = useCallback(() => {
    if (!wallet) {
      setBalanceTinybars(null);
      return;
    }
    getPendingWithdrawalClient(wallet.address as `0x${string}`)
      .then(setBalanceTinybars)
      .catch(() => setBalanceTinybars(null));
  }, [wallet]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  useEffect(() => {
    if (error && FAILURE_STATES.has(state)) toast.error(error);
  }, [error, state]);

  useEffect(() => {
    if (state === "WITHDRAWN") refreshBalance();
  }, [state, refreshBalance]);

  if (!wallet || balanceTinybars === null || balanceTinybars === 0n) return null;

  const busy = !["IDLE", "WITHDRAWN"].includes(state) && !FAILURE_STATES.has(state);

  return (
    <div className="vc-card vc-neon-panel mb-6 flex flex-col gap-3 rounded-xl border border-[var(--vc-accent)]/40 bg-[var(--surface)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wallet size={18} className="text-[var(--vc-accent)]" />
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {tinybarsToHbarString(balanceTinybars)} HBAR available from sales
            </p>
            <p className="text-xs text-[var(--muted)]">
              Proceeds from completed sales sit in escrow until you withdraw.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void withdraw(wallet as unknown as EthereumWalletLike)}
          className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--vc-accent)] px-5 text-xs font-medium text-white disabled:opacity-50 ${
            busy ? "vc-glow-pulse" : ""
          }`}
        >
          {busy ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : state === "WITHDRAWN" ? (
            <Check size={14} />
          ) : FAILURE_STATES.has(state) ? (
            <TriangleAlert size={14} />
          ) : null}
          {STATE_LABEL[state]}
        </button>
      </div>

      {progressFor(state) ? <TransactionSteps steps={STEPS} {...progressFor(state)!} /> : null}

      {txHash ? (
        <a
          href={`https://hashscan.io/testnet/transaction/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 font-mono text-xs text-[var(--vc-accent)] hover:underline"
        >
          {txHash}
          <ExternalLink size={12} />
        </a>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
