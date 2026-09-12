"use client";

import { useCallback, useState } from "react";
import {
  SignatureRejectedError,
  transferProductOwnership,
} from "@/lib/consumer/adapters/nft-transfer-adapter";
import { WrongNetworkError } from "@/lib/consumer/chain/hedera-wallet-client";
import { waitForRealReceipt } from "@/lib/consumer/chain/watch-transaction";
import type { EthereumWalletLike } from "@/lib/consumer/chain/hedera-wallet-client";
import type { TransferState } from "@/lib/consumer/types";
import { HEDERA_CONSUMER_NFT_ADDRESS } from "@verichain/shared";

const NFT_CONTRACT_ADDRESS = HEDERA_CONSUMER_NFT_ADDRESS;

export type TransferHookState = {
  state: TransferState;
  txHash: `0x${string}` | null;
  error: string | null;
  syncStatus: "PENDING" | "SYNCED" | "SYNC_FAILED" | "NOT_APPLICABLE";
};

function log(event: string, source: "frontend", fields: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event, source, ...fields, timestamp: new Date().toISOString() }));
}

/**
 * Drives the real, blockchain-first transfer lifecycle end to end:
 * backend preflight -> real wallet signature -> real Hedera submission ->
 * frontend shows the tx hash immediately -> independent Hedera watcher ->
 * on-chain ownership verification -> async backend reconciliation.
 *
 * Supabase reconciliation never blocks the CONFIRMED state shown to the
 * user — see CONSUMER_BACKEND_PLAN.md's "Architecture correction".
 */
export function useNftTransfer(productId: string) {
  const [hookState, setHookState] = useState<TransferHookState>({
    state: "IDLE",
    txHash: null,
    error: null,
    syncStatus: "NOT_APPLICABLE",
  });

  const transfer = useCallback(
    async (wallet: EthereumWalletLike, toWalletAddress: string) => {
      const fromWalletAddress = wallet.address as `0x${string}`;
      setHookState({ state: "VALIDATING", txHash: null, error: null, syncStatus: "NOT_APPLICABLE" });
      log("ownership.transfer.requested", "frontend", { productId, toWalletAddress });

      const idempotencyKey = crypto.randomUUID();
      const preflightRes = await fetch("/api/consumer/transfers/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, toWalletAddress, idempotencyKey }),
      });
      const preflightBody = await preflightRes.json();

      if (!preflightRes.ok) {
        setHookState({
          state: "TRANSACTION_FAILED",
          txHash: null,
          error: preflightBody.error ?? "Preflight validation failed",
          syncStatus: "NOT_APPLICABLE",
        });
        return;
      }

      const productIdHash = preflightBody.productIdHash as `0x${string}`;
      const transferId = preflightBody.transferId as string;

      setHookState((prev) => ({ ...prev, state: "AWAITING_SIGNATURE" }));
      log("ownership.transfer.signature.requested", "frontend", { productId });

      let txHash: `0x${string}`;
      try {
        const result = await transferProductOwnership({
          wallet,
          productIdHash,
          fromWalletAddress,
          toWalletAddress: toWalletAddress as `0x${string}`,
          nftContractAddress: NFT_CONTRACT_ADDRESS,
        });
        txHash = result.txHash;
      } catch (error) {
        if (error instanceof WrongNetworkError) {
          setHookState({
            state: "WRONG_NETWORK",
            txHash: null,
            error: error.message,
            syncStatus: "NOT_APPLICABLE",
          });
          return;
        }
        if (error instanceof SignatureRejectedError) {
          setHookState({
            state: "SIGNATURE_REJECTED",
            txHash: null,
            error: error.message,
            syncStatus: "NOT_APPLICABLE",
          });
          return;
        }
        setHookState({
          state: "TRANSACTION_FAILED",
          txHash: null,
          error: error instanceof Error ? error.message : "Wallet transaction failed",
          syncStatus: "NOT_APPLICABLE",
        });
        return;
      }

      // Real tx hash available immediately — shown before any confirmation,
      // before any backend call.
      setHookState({ state: "SUBMITTED", txHash, error: null, syncStatus: "NOT_APPLICABLE" });
      log("ownership.transfer.submitted", "frontend", { productId, txHash });

      setHookState((prev) => ({ ...prev, state: "CONFIRMING_ON_HEDERA" }));
      const outcome = await waitForRealReceipt(txHash);

      if (outcome === "REVERTED") {
        setHookState({
          state: "TRANSACTION_REVERTED",
          txHash,
          error: "The transaction was reverted on Hedera.",
          syncStatus: "NOT_APPLICABLE",
        });
        return;
      }
      if (outcome === "TIMED_OUT") {
        setHookState({
          state: "TRANSACTION_FAILED",
          txHash,
          error: "Timed out waiting for Hedera confirmation. Check HashScan for the latest status.",
          syncStatus: "NOT_APPLICABLE",
        });
        return;
      }

      log("ownership.transfer.receipt.confirmed", "frontend", { productId, txHash });
      setHookState((prev) => ({ ...prev, state: "VERIFYING_OWNERSHIP" }));

      // Async from here: reconciliation must not block showing CONFIRMED
      // once ownership is verified on-chain.
      const reconcileRes = await fetch("/api/consumer/transfers/reconcile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transferId, productId, productIdHash, txHash, toWalletAddress }),
      });
      const reconcileBody = await reconcileRes.json();

      if (!reconcileRes.ok || !reconcileBody.verified) {
        setHookState({
          state: "OWNERSHIP_VERIFICATION_FAILED",
          txHash,
          error: "Could not verify the new owner on-chain.",
          syncStatus: "NOT_APPLICABLE",
        });
        return;
      }

      setHookState({
        state: "CONFIRMED",
        txHash,
        error: null,
        syncStatus: reconcileBody.synced ? "SYNCED" : "SYNC_FAILED",
      });
      log("ownership.transfer.completed", "frontend", {
        productId,
        txHash,
        synced: reconcileBody.synced,
      });
    },
    [productId],
  );

  return { ...hookState, transfer };
}
