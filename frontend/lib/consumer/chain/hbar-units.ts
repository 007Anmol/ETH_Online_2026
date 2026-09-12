"use client";

import { parseEther } from "viem";

/**
 * Client-safe duplicate of the pure conversion math in
 * services/hedera/src/consumer.ts (which can't be imported into a client
 * bundle — it transitively pulls in client.ts's `import "server-only"`).
 * Keep these numerically identical to that module; see
 * CONSUMER_BACKEND_PLAN.md for why Hedera's msg.value is tinybar-scaled
 * while the transaction's `value` field stays in the normal 18-decimal
 * convention.
 */
export function hbarToTinybars(hbar: number | string): bigint {
  return parseEther(String(hbar)) / 10n ** 10n;
}

export function hbarToTransactionValue(hbar: number | string): bigint {
  return parseEther(String(hbar));
}

export function tinybarsToHbarString(tinybars: bigint): string {
  const TINYBARS_PER_HBAR = 100_000_000n;
  const whole = tinybars / TINYBARS_PER_HBAR;
  const remainder = tinybars % TINYBARS_PER_HBAR;
  if (remainder === 0n) return whole.toString();
  const fraction = remainder.toString().padStart(8, "0").replace(/0+$/, "");
  return `${whole}.${fraction}`;
}
