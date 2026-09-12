/**
 * Team 3 — Consumer NFT ownership + resale writes/reads.
 * Call these from API routes / lib — never from the browser (same rule as
 * registry.ts). See frontend/CONSUMER_BACKEND_PLAN.md for the full plan and
 * the live Hedera testnet verification these addresses/units are based on.
 */

import consumerNftAbiJson from "@verichain/shared/abi/VeriChainConsumerNFT.json";
import marketplaceAbiJson from "@verichain/shared/abi/VeriChainMarketplace.json";
import {
  HEDERA_CONSUMER_MARKETPLACE_ADDRESS,
  HEDERA_CONSUMER_NFT_ADDRESS,
  HEDERA_TESTNET_CHAIN_ID,
  HEDERA_TESTNET_RPC_URL,
  HEDERA_TINYBARS_PER_HBAR,
} from "@verichain/shared";
import { createPublicClient, defineChain, http, parseEther, type Abi, type Address } from "viem";
import { getHederaConfig, sendContractCall } from "./client";

const consumerNftAbi = consumerNftAbiJson as Abi;
const marketplaceAbi = marketplaceAbiJson as Abi;

/**
 * Hedera's EVM delivers `msg.value` to a contract in tinybar units (8
 * decimals), not the 18-decimal "weibar" a transaction's `value` field is
 * denominated in — confirmed by live testing against the deployed
 * `VeriChainMarketplace` (see CONSUMER_BACKEND_PLAN.md). These two functions
 * are the ONLY place that conversion should happen; every call site should
 * use them rather than hand-rolling the ×/÷ 10^10 factor.
 */
export function hbarToTinybars(hbar: number | string): bigint {
  // parseEther gives the standard 18-decimal fixed-point representation of
  // the human HBAR amount; dividing by the tinybar-per-weibar factor (10^10)
  // yields the exact tinybar count a Hedera contract will see as msg.value,
  // and is also the correct unit for a VeriChainMarketplace listing `price`.
  return parseEther(String(hbar)) / (10n ** 10n);
}

export function tinybarsToHbarString(tinybars: bigint): string {
  const hbarWhole = tinybars / HEDERA_TINYBARS_PER_HBAR;
  const remainder = tinybars % HEDERA_TINYBARS_PER_HBAR;
  if (remainder === 0n) return hbarWhole.toString();
  const fraction = remainder.toString().padStart(8, "0").replace(/0+$/, "");
  return `${hbarWhole}.${fraction}`;
}

/**
 * The `value` to attach to the transaction itself (standard 18-decimal
 * convention — what a wallet/viem expects) so that the contract observes
 * `msg.value` equal to the given HBAR amount in tinybars. This is
 * numerically identical to `parseEther(hbar)`, but named/exported
 * separately from `hbarToTinybars` so a call site can never confuse "the
 * amount to put in a contract's price field" with "the amount to attach to
 * the transaction" — they happen to invert the same factor, which is
 * exactly the mistake that produced `IncorrectPayment` during live testing.
 */
export function hbarToTransactionValue(hbar: number | string): bigint {
  return parseEther(String(hbar));
}

function hederaChain() {
  const { rpcUrl, chainId } = getHederaConfig();
  return defineChain({
    id: chainId,
    name: "Hedera Testnet",
    nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl || HEDERA_TESTNET_RPC_URL] } },
  });
}

function publicClient() {
  const { rpcUrl } = getHederaConfig();
  return createPublicClient({
    chain: hederaChain(),
    transport: http(rpcUrl || HEDERA_TESTNET_RPC_URL),
  });
}

export type ConsumerTx = { txHash: `0x${string}` };

// ---------------------------------------------------------------------------
// VeriChainConsumerNFT
// ---------------------------------------------------------------------------

/** Mints consumer ownership for a product exactly once (authorized operator only). */
export async function mintConsumerNftOnChain(input: {
  productIdHash: `0x${string}`;
  initialOwner: Address;
}): Promise<ConsumerTx> {
  const result = await sendContractCall({
    address: HEDERA_CONSUMER_NFT_ADDRESS as Address,
    abi: consumerNftAbi,
    functionName: "mint",
    args: [input.productIdHash, input.initialOwner],
  });
  if (!result.ok) throw new Error(result.revertReason);
  return { txHash: result.txHash };
}

export async function isMarketplaceApproved(ownerAddress: Address): Promise<boolean> {
  return (await publicClient().readContract({
    address: HEDERA_CONSUMER_NFT_ADDRESS as Address,
    abi: consumerNftAbi,
    functionName: "isApprovedForAll",
    args: [ownerAddress, HEDERA_CONSUMER_MARKETPLACE_ADDRESS],
  })) as boolean;
}

export async function getConsumerNftOwner(productIdHash: `0x${string}`): Promise<Address | null> {
  try {
    const owner = await publicClient().readContract({
      address: HEDERA_CONSUMER_NFT_ADDRESS as Address,
      abi: consumerNftAbi,
      functionName: "ownerOf",
      args: [productIdHash],
    });
    return owner as Address;
  } catch {
    // ownerOf reverts (TokenNotFound) for an unminted product — treat as "no owner" for callers.
    return null;
  }
}

// ---------------------------------------------------------------------------
// VeriChainMarketplace
// ---------------------------------------------------------------------------

export type OnChainListing = {
  seller: Address;
  priceTinybars: bigint;
  status: "None" | "Active" | "Sold" | "Cancelled";
};

const LISTING_STATUS_NAMES = ["None", "Active", "Sold", "Cancelled"] as const;

export async function getOnChainListing(productIdHash: `0x${string}`): Promise<OnChainListing> {
  // The contract returns a `Listing` struct — viem decodes a single
  // struct/tuple return value as a plain object keyed by its ABI component
  // names, not as an array to destructure.
  const listing = (await publicClient().readContract({
    address: HEDERA_CONSUMER_MARKETPLACE_ADDRESS as Address,
    abi: marketplaceAbi,
    functionName: "getListing",
    args: [productIdHash],
  })) as { seller: Address; price: bigint; status: number };

  return {
    seller: listing.seller,
    priceTinybars: listing.price,
    status: LISTING_STATUS_NAMES[listing.status] ?? "None",
  };
}

/**
 * Authorized on-chain mirror of an off-chain `SUSPECT_COUNTERFEIT`/`REVOKED`
 * finding. Per CONSUMER_BACKEND_PLAN.md's audit: nothing in this repo sets
 * that product status yet, so nothing should call this yet either — wire it
 * only from whatever authorized investigation-outcome workflow ends up
 * owning that transition, never directly from a grievance submission.
 */
export async function setProductBlockedOnChain(input: {
  productIdHash: `0x${string}`;
  isBlocked: boolean;
}): Promise<ConsumerTx> {
  const result = await sendContractCall({
    address: HEDERA_CONSUMER_MARKETPLACE_ADDRESS as Address,
    abi: marketplaceAbi,
    functionName: "setProductBlocked",
    args: [input.productIdHash, input.isBlocked],
  });
  if (!result.ok) throw new Error(result.revertReason);
  return { txHash: result.txHash };
}

/**
 * Cancels a listing. `sellerPrivateKey`/on-behalf-of-user signing is not
 * implemented here — see the "still unbuilt" note in
 * CONSUMER_BACKEND_PLAN.md: real user-authorized transactions need the
 * browser wallet to sign, not the server operator key. This function exists
 * for server-side/test-harness use (e.g. an authorized admin cancellation),
 * not as the path a consumer's own cancel button should take once wallet
 * signing exists.
 */
export async function cancelListingOnChain(productIdHash: `0x${string}`): Promise<ConsumerTx> {
  const result = await sendContractCall({
    address: HEDERA_CONSUMER_MARKETPLACE_ADDRESS as Address,
    abi: marketplaceAbi,
    functionName: "cancelListing",
    args: [productIdHash],
    gas: 300_000n,
  });
  if (!result.ok) throw new Error(result.revertReason);
  return { txHash: result.txHash };
}

/** Gas limits confirmed by live testing (see CONSUMER_BACKEND_PLAN.md) — Hedera's
 *  `eth_estimateGas` under-provisions for `buy`, so this must stay explicit. */
export const CONSUMER_MARKETPLACE_BUY_GAS = 500_000n;
export const CONSUMER_MARKETPLACE_SIMPLE_WRITE_GAS = 300_000n;
export const CONSUMER_NFT_SIMPLE_WRITE_GAS = 250_000n;
