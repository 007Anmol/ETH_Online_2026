"use client";

import { createPublicClient, http, WaitForTransactionReceiptTimeoutError } from "viem";
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
    // Matching viem's actual error class here, not a message-substring regex
    // — viem's real message is "Timed out while waiting..." which a naive
    // /timeout/i check never matches ("Timed" + " out" isn't "timeout"),
    // so this was silently becoming an uncaught promise rejection instead
    // of the TIMED_OUT outcome callers already handle.
    if (error instanceof WaitForTransactionReceiptTimeoutError) return "TIMED_OUT";
    throw error;
  }
}
