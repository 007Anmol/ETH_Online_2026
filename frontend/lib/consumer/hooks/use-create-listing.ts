"use client";

import { useCallback, useState } from "react";
import {
  approveMarketplaceForAll,
  createListingOnChain,
} from "@/lib/consumer/adapters/marketplace-adapter";
import { SignatureRejectedError } from "@/lib/consumer/adapters/nft-transfer-adapter";
import { WrongNetworkError } from "@/lib/consumer/chain/hedera-wallet-client";
import { hbarToTinybars } from "@/lib/consumer/chain/hbar-units";
import { waitForRealReceipt } from "@/lib/consumer/chain/watch-transaction";
import type { EthereumWalletLike } from "@/lib/consumer/chain/hedera-wallet-client";

const NFT_CONTRACT_ADDRESS = "0xF217e76F80a2743769B3f6D51bE1F1B6C2cC7b49" as const;
const MARKETPLACE_CONTRACT_ADDRESS = "0xCC98075D05c02a7f136ff534bB01C5bE4476da4F" as const;

export type CreateListingState =
  | "IDLE"
  | "VALIDATING"
  | "AWAITING_APPROVAL_SIGNATURE"
  | "CONFIRMING_APPROVAL"
  | "AWAITING_SIGNATURE"
  | "SUBMITTED"
  | "CONFIRMING_ON_HEDERA"
  | "VERIFYING_LISTING"
  | "CONFIRMED"
  | "SIGNATURE_REJECTED"
  | "TRANSACTION_REVERTED"
  | "TRANSACTION_FAILED"
  | "WRONG_NETWORK";

function log(event: string, fields: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event, source: "frontend", ...fields, timestamp: new Date().toISOString() }));
}

export function useCreateListing(productId: string) {
  const [state, setState] = useState<CreateListingState>("IDLE");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createListing = useCallback(
    async (wallet: EthereumWalletLike, priceHbar: number, needsApproval: boolean) => {
      setState("VALIDATING");
      setError(null);
      log("marketplace.listing.requested", { productId, priceHbar });

      const preflightRes = await fetch("/api/consumer/marketplace/listings/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, priceHbar }),
      });
      const preflightBody = await preflightRes.json();
      if (!preflightRes.ok) {
        setState("TRANSACTION_FAILED");
        setError(preflightBody.error ?? "Preflight validation failed");
        return;
      }
      log("marketplace.listing.preflight.validated", { productId });
      const productIdHash = preflightBody.productIdHash as `0x${string}`;

      try {
        if (needsApproval) {
          setState("AWAITING_APPROVAL_SIGNATURE");
          const { txHash: approvalTx } = await approveMarketplaceForAll({
            wallet,
            nftContractAddress: NFT_CONTRACT_ADDRESS,
            marketplaceContractAddress: MARKETPLACE_CONTRACT_ADDRESS,
          });
          setState("CONFIRMING_APPROVAL");
          const approvalOutcome = await waitForRealReceipt(approvalTx);
          if (approvalOutcome !== "CONFIRMED") {
            setState("TRANSACTION_FAILED");
            setError("Marketplace approval transaction did not confirm.");
            return;
          }
        }

        setState("AWAITING_SIGNATURE");
        const priceTinybars = hbarToTinybars(priceHbar);
        const { txHash: listingTx } = await createListingOnChain({
          wallet,
          marketplaceContractAddress: MARKETPLACE_CONTRACT_ADDRESS,
          productIdHash,
          priceTinybars,
        });
        setTxHash(listingTx);
        setState("SUBMITTED");
        log("marketplace.listing.submitted", { productId, txHash: listingTx });

        setState("CONFIRMING_ON_HEDERA");
        const outcome = await waitForRealReceipt(listingTx);
        if (outcome === "REVERTED") {
          setState("TRANSACTION_REVERTED");
          setError("The listing transaction was reverted on Hedera.");
          return;
        }
        if (outcome === "TIMED_OUT") {
          setState("TRANSACTION_FAILED");
          setError("Timed out waiting for Hedera confirmation.");
          return;
        }

        setState("VERIFYING_LISTING");
        const reconcileRes = await fetch("/api/consumer/marketplace/listings/reconcile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, productIdHash, txHash: listingTx }),
        });
        const reconcileBody = await reconcileRes.json();
        if (!reconcileRes.ok || !reconcileBody.verified) {
          setState("TRANSACTION_FAILED");
          setError("Could not verify the listing on-chain.");
          return;
        }

        setState("CONFIRMED");
        log("marketplace.listing.confirmed", { productId, txHash: listingTx });
      } catch (caught) {
        if (caught instanceof WrongNetworkError) {
          setState("WRONG_NETWORK");
          setError(caught.message);
        } else if (caught instanceof SignatureRejectedError) {
          setState("SIGNATURE_REJECTED");
          setError(caught.message);
        } else {
          setState("TRANSACTION_FAILED");
          setError(caught instanceof Error ? caught.message : "Listing creation failed");
        }
      }
    },
    [productId],
  );

  return { state, txHash, error, createListing };
}
