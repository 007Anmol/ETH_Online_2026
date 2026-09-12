"use client";

import { useCallback, useState } from "react";
import { withdrawProceedsOnChain } from "@/lib/consumer/adapters/marketplace-adapter";
import { SignatureRejectedError } from "@/lib/consumer/adapters/nft-transfer-adapter";
import { WrongNetworkError } from "@/lib/consumer/chain/hedera-wallet-client";
import { waitForRealReceipt } from "@/lib/consumer/chain/watch-transaction";
import type { EthereumWalletLike } from "@/lib/consumer/chain/hedera-wallet-client";
import { HEDERA_CONSUMER_MARKETPLACE_ADDRESS } from "@verichain/shared";

const MARKETPLACE_CONTRACT_ADDRESS = HEDERA_CONSUMER_MARKETPLACE_ADDRESS;

export type WithdrawState =
  | "IDLE"
  | "AWAITING_SIGNATURE"
  | "SUBMITTED"
  | "CONFIRMING_ON_HEDERA"
  | "WITHDRAWN"
  | "SIGNATURE_REJECTED"
  | "TRANSACTION_REVERTED"
  | "TRANSACTION_FAILED"
  | "WRONG_NETWORK";

/** Claims a seller's `pendingWithdrawals` balance via the marketplace
 *  contract's `withdraw()`. Purely on-chain — no Supabase reconciliation,
 *  since this doesn't change any listing/ownership row the backend mirrors. */
export function useWithdrawProceeds() {
  const [state, setState] = useState<WithdrawState>("IDLE");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const withdraw = useCallback(async (wallet: EthereumWalletLike) => {
    setError(null);
    try {
      setState("AWAITING_SIGNATURE");
      const { txHash: withdrawTx } = await withdrawProceedsOnChain({
        wallet,
        marketplaceContractAddress: MARKETPLACE_CONTRACT_ADDRESS,
      });
      setTxHash(withdrawTx);
      setState("SUBMITTED");

      setState("CONFIRMING_ON_HEDERA");
      const outcome = await waitForRealReceipt(withdrawTx);
      if (outcome === "REVERTED") {
        setState("TRANSACTION_REVERTED");
        setError("The withdrawal transaction was reverted on Hedera.");
        return;
      }
      if (outcome === "TIMED_OUT") {
        setState("TRANSACTION_FAILED");
        setError("Timed out waiting for Hedera confirmation.");
        return;
      }

      setState("WITHDRAWN");
    } catch (caught) {
      if (caught instanceof WrongNetworkError) {
        setState("WRONG_NETWORK");
        setError(caught.message);
      } else if (caught instanceof SignatureRejectedError) {
        setState("SIGNATURE_REJECTED");
        setError(caught.message);
      } else {
        setState("TRANSACTION_FAILED");
        setError(caught instanceof Error ? caught.message : "Withdrawal failed");
      }
    }
  }, []);

  return { state, txHash, error, withdraw };
}
