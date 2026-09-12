"use client";

import { useCallback, useState } from "react";
import { cancelListingOnChain } from "@/lib/consumer/adapters/marketplace-adapter";
import { SignatureRejectedError } from "@/lib/consumer/adapters/nft-transfer-adapter";
import { WrongNetworkError } from "@/lib/consumer/chain/hedera-wallet-client";
import { waitForRealReceipt } from "@/lib/consumer/chain/watch-transaction";
import type { EthereumWalletLike } from "@/lib/consumer/chain/hedera-wallet-client";
import { HEDERA_CONSUMER_MARKETPLACE_ADDRESS } from "@verichain/shared";

const MARKETPLACE_CONTRACT_ADDRESS = HEDERA_CONSUMER_MARKETPLACE_ADDRESS;

export type CancelListingState =
  | "IDLE"
  | "AWAITING_SIGNATURE"
  | "SUBMITTED"
  | "CONFIRMING_ON_HEDERA"
  | "CANCELLED"
  | "SIGNATURE_REJECTED"
  | "TRANSACTION_REVERTED"
  | "TRANSACTION_FAILED"
  | "WRONG_NETWORK";

export function useCancelListing(productId: string, productIdHash: `0x${string}`) {
  const [state, setState] = useState<CancelListingState>("IDLE");
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback(
    async (wallet: EthereumWalletLike) => {
      setError(null);
      try {
        setState("AWAITING_SIGNATURE");
        const { txHash } = await cancelListingOnChain({
          wallet,
          marketplaceContractAddress: MARKETPLACE_CONTRACT_ADDRESS,
          productIdHash,
        });
        setState("SUBMITTED");

        setState("CONFIRMING_ON_HEDERA");
        const outcome = await waitForRealReceipt(txHash);
        if (outcome === "REVERTED") {
          setState("TRANSACTION_REVERTED");
          setError("The cancellation transaction was reverted on Hedera.");
          return;
        }
        if (outcome === "TIMED_OUT") {
          setState("TRANSACTION_FAILED");
          setError("Timed out waiting for Hedera confirmation.");
          return;
        }

        await fetch("/api/consumer/marketplace/listings/cancel", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, productIdHash, txHash }),
        });

        setState("CANCELLED");
      } catch (caught) {
        if (caught instanceof WrongNetworkError) {
          setState("WRONG_NETWORK");
          setError(caught.message);
        } else if (caught instanceof SignatureRejectedError) {
          setState("SIGNATURE_REJECTED");
          setError(caught.message);
        } else {
          setState("TRANSACTION_FAILED");
          setError(caught instanceof Error ? caught.message : "Cancellation failed");
        }
      }
    },
    [productId, productIdHash],
  );

  return { state, error, cancel };
}
