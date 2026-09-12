"use client";

import { createPublicClient, http } from "viem";
import { HEDERA_TESTNET } from "@/lib/consumer/chain/hedera-wallet-client";

export type ReceiptOutcome = "CONFIRMED" | "REVERTED" | "TIMED_OUT";

const publicClient = createPublicClient({
  chain: HEDERA_TESTNET,
  transport: http(HEDERA_TESTNET.rpcUrls.default.http[0]),
});

/**
 * Waits for a real Hedera transaction receipt. No artificial delay — this
 * resolves exactly when the chain actually confirms (or reverts, or times
 * out), per CONSUMER_BACKEND_PLAN.md's "no fake progress" rule.
 */
export async function waitForRealReceipt(
  txHash: `0x${string}`,
  timeoutMs = 60_000,
): Promise<ReceiptOutcome> {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: timeoutMs,
    });
    return receipt.status === "success" ? "CONFIRMED" : "REVERTED";
  } catch (error) {
    if (error instanceof Error && /timeout/i.test(error.message)) return "TIMED_OUT";
    throw error;
  }
}
