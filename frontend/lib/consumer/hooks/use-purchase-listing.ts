"use client";

import { useCallback, useState } from "react";
import { buyListingOnChain } from "@/lib/consumer/adapters/marketplace-adapter";
import { SignatureRejectedError } from "@/lib/consumer/adapters/nft-transfer-adapter";
import { WrongNetworkError } from "@/lib/consumer/chain/hedera-wallet-client";
import { waitForRealReceipt } from "@/lib/consumer/chain/watch-transaction";
import type { EthereumWalletLike } from "@/lib/consumer/chain/hedera-wallet-client";

const MARKETPLACE_CONTRACT_ADDRESS = "0xCC98075D05c02a7f136ff534bB01C5bE4476da4F" as const;

export type PurchaseState =
  | "IDLE"
  | "VALIDATING_LISTING"
  | "AWAITING_SIGNATURE"
  | "SUBMITTED"
  | "CONFIRMING_ON_HEDERA"
  | "VERIFYING_OWNERSHIP"
  | "COMPLETED"
  | "SIGNATURE_REJECTED"
  | "TRANSACTION_REVERTED"
  | "TRANSACTION_FAILED"
  | "OWNERSHIP_VERIFICATION_FAILED"
  | "WRONG_NETWORK";

function log(event: string, fields: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event, source: "frontend", ...fields, timestamp: new Date().toISOString() }));
}

export function usePurchaseListing(productId: string) {
  const [state, setState] = useState<PurchaseState>("IDLE");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const purchase = useCallback(
    async (wallet: EthereumWalletLike) => {
      setState("VALIDATING_LISTING");
      setError(null);
      log("marketplace.purchase.requested", { productId });

      const preflightRes = await fetch("/api/consumer/marketplace/purchase/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const preflightBody = await preflightRes.json();
      if (!preflightRes.ok) {
        setState("TRANSACTION_FAILED");
        setError(preflightBody.error ?? "Preflight validation failed");
        return;
      }
      log("marketplace.purchase.preflight.validated", { productId });

      const productIdHash = preflightBody.productIdHash as `0x${string}`;
      // Real transaction value is the tinybar price scaled back up by 10^10
      // (see CONSUMER_BACKEND_PLAN.md's msg.value finding) — computed here,
      // not re-derived from any client-entered HBAR amount.
      const transactionValue = BigInt(preflightBody.priceTinybars) * 10n ** 10n;

      try {
        setState("AWAITING_SIGNATURE");
        const idempotencyKey = crypto.randomUUID();
        const { txHash: buyTx } = await buyListingOnChain({
          wallet,
          marketplaceContractAddress: MARKETPLACE_CONTRACT_ADDRESS,
          productIdHash,
          transactionValue,
        });
        setTxHash(buyTx);
        setState("SUBMITTED");
        log("marketplace.purchase.submitted", { productId, txHash: buyTx });

        setState("CONFIRMING_ON_HEDERA");
        const outcome = await waitForRealReceipt(buyTx);
        if (outcome === "REVERTED") {
          setState("TRANSACTION_REVERTED");
          setError("The purchase transaction was reverted on Hedera.");
          return;
        }
        if (outcome === "TIMED_OUT") {
          setState("TRANSACTION_FAILED");
          setError("Timed out waiting for Hedera confirmation.");
          return;
        }

        setState("VERIFYING_OWNERSHIP");
        const reconcileRes = await fetch("/api/consumer/marketplace/purchase/reconcile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, productIdHash, txHash: buyTx, idempotencyKey }),
        });
        const reconcileBody = await reconcileRes.json();
        if (!reconcileRes.ok || !reconcileBody.verified) {
          setState("OWNERSHIP_VERIFICATION_FAILED");
          setError("Could not verify the sale on-chain.");
          return;
        }

        setState("COMPLETED");
        log("marketplace.sale.completed", { productId, txHash: buyTx });
      } catch (caught) {
        if (caught instanceof WrongNetworkError) {
          setState("WRONG_NETWORK");
          setError(caught.message);
        } else if (caught instanceof SignatureRejectedError) {
          setState("SIGNATURE_REJECTED");
          setError(caught.message);
        } else {
          setState("TRANSACTION_FAILED");
          setError(caught instanceof Error ? caught.message : "Purchase failed");
        }
      }
    },
    [productId],
  );

  return { state, txHash, error, purchase };
}
