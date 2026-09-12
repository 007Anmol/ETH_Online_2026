"use client";

import consumerNftAbiJson from "@verichain/shared/abi/VeriChainConsumerNFT.json";
import marketplaceAbiJson from "@verichain/shared/abi/VeriChainMarketplace.json";
import { encodeFunctionData, type Abi } from "viem";
import { getWalletClient, HEDERA_TESTNET } from "@/lib/consumer/chain/hedera-wallet-client";
import type { EthereumWalletLike } from "@/lib/consumer/chain/hedera-wallet-client";
import { SignatureRejectedError } from "@/lib/consumer/adapters/nft-transfer-adapter";

const consumerNftAbi = consumerNftAbiJson as Abi;
const marketplaceAbi = marketplaceAbiJson as Abi;

/** Confirmed by live testing (CONSUMER_BACKEND_PLAN.md) — Hedera's
 *  eth_estimateGas under-provisions for these contract paths. */
const APPROVAL_GAS_LIMIT = 250_000n;
const LISTING_GAS_LIMIT = 300_000n;
const BUY_GAS_LIMIT = 500_000n;
const WITHDRAW_GAS_LIMIT = 150_000n;

function isUserRejection(error: unknown): boolean {
  const message =
    error && typeof error === "object"
      ? String((error as { shortMessage?: unknown; message?: unknown }).shortMessage ??
          (error as { message?: unknown }).message ??
          "")
      : String(error);
  return /reject|denied|cancelled|user disapproved/i.test(message);
}

async function send(
  wallet: EthereumWalletLike,
  to: `0x${string}`,
  data: `0x${string}`,
  gas: bigint,
  value?: bigint,
): Promise<`0x${string}`> {
  const walletClient = await getWalletClient(wallet);
  try {
    return await walletClient.sendTransaction({
      chain: HEDERA_TESTNET,
      account: wallet.address as `0x${string}`,
      to,
      data,
      gas,
      ...(value !== undefined ? { value } : {}),
    });
  } catch (error) {
    if (isUserRejection(error)) throw new SignatureRejectedError();
    throw error;
  }
}

/** One-time approval letting the marketplace contract move any of the
 *  seller's tokens — required before the first listing. */
export async function approveMarketplaceForAll(input: {
  wallet: EthereumWalletLike;
  nftContractAddress: `0x${string}`;
  marketplaceContractAddress: `0x${string}`;
}): Promise<{ txHash: `0x${string}` }> {
  const data = encodeFunctionData({
    abi: consumerNftAbi,
    functionName: "setApprovalForAll",
    args: [input.marketplaceContractAddress, true],
  });
  const txHash = await send(input.wallet, input.nftContractAddress, data, APPROVAL_GAS_LIMIT);
  return { txHash };
}

export async function createListingOnChain(input: {
  wallet: EthereumWalletLike;
  marketplaceContractAddress: `0x${string}`;
  productIdHash: `0x${string}`;
  priceTinybars: bigint;
}): Promise<{ txHash: `0x${string}` }> {
  const data = encodeFunctionData({
    abi: marketplaceAbi,
    functionName: "createListing",
    args: [input.productIdHash, input.priceTinybars],
  });
  const txHash = await send(
    input.wallet,
    input.marketplaceContractAddress,
    data,
    LISTING_GAS_LIMIT,
  );
  return { txHash };
}

export async function cancelListingOnChain(input: {
  wallet: EthereumWalletLike;
  marketplaceContractAddress: `0x${string}`;
  productIdHash: `0x${string}`;
}): Promise<{ txHash: `0x${string}` }> {
  const data = encodeFunctionData({
    abi: marketplaceAbi,
    functionName: "cancelListing",
    args: [input.productIdHash],
  });
  const txHash = await send(
    input.wallet,
    input.marketplaceContractAddress,
    data,
    LISTING_GAS_LIMIT,
  );
  return { txHash };
}

/**
 * Buys a listing. `priceTinybars` must be the exact on-chain listing price
 * (read via getOnChainListing, never re-derived from a client-entered
 * amount) — the transaction `value` is the corresponding 18-decimal figure
 * per the Hedera msg.value finding (services/hedera/src/consumer.ts's
 * hbarToTransactionValue does this conversion; this adapter takes the
 * already-converted value to keep the unit boundary in one place).
 */
export async function buyListingOnChain(input: {
  wallet: EthereumWalletLike;
  marketplaceContractAddress: `0x${string}`;
  productIdHash: `0x${string}`;
  transactionValue: bigint;
}): Promise<{ txHash: `0x${string}` }> {
  const data = encodeFunctionData({
    abi: marketplaceAbi,
    functionName: "buy",
    args: [input.productIdHash],
  });
  const txHash = await send(
    input.wallet,
    input.marketplaceContractAddress,
    data,
    BUY_GAS_LIMIT,
    input.transactionValue,
  );
  return { txHash };
}

/** Pull-payment settlement — moves a seller's `pendingWithdrawals` balance
 *  to their wallet. Real HBAR, real transaction; there is no reconciliation
 *  step because this doesn't change listing/ownership state Supabase mirrors. */
export async function withdrawProceedsOnChain(input: {
  wallet: EthereumWalletLike;
  marketplaceContractAddress: `0x${string}`;
}): Promise<{ txHash: `0x${string}` }> {
  const data = encodeFunctionData({
    abi: marketplaceAbi,
    functionName: "withdraw",
    args: [],
  });
  const txHash = await send(
    input.wallet,
    input.marketplaceContractAddress,
    data,
    WITHDRAW_GAS_LIMIT,
  );
  return { txHash };
}
