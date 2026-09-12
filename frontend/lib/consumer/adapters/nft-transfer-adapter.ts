"use client";

import consumerNftAbiJson from "@verichain/shared/abi/VeriChainConsumerNFT.json";
import { encodeFunctionData, type Abi } from "viem";
import {
  getWalletClient,
  HEDERA_TESTNET,
  type EthereumWalletLike,
} from "@/lib/consumer/chain/hedera-wallet-client";

const consumerNftAbi = consumerNftAbiJson as Abi;

/** See CONSUMER_BACKEND_PLAN.md: confirmed by live testing that Hedera's
 *  eth_estimateGas under-provisions for this contract — explicit gas only. */
const TRANSFER_GAS_LIMIT = 250_000n;

export class SignatureRejectedError extends Error {
  constructor() {
    super("Wallet signature was rejected.");
    this.name = "SignatureRejectedError";
  }
}

function isUserRejection(error: unknown): boolean {
  const message =
    error && typeof error === "object"
      ? String((error as { message?: unknown; shortMessage?: unknown }).shortMessage ??
          (error as { message?: unknown }).message ??
          "")
      : String(error);
  return /reject|denied|cancelled|user disapproved/i.test(message);
}

/**
 * Signs and submits a REAL VeriChainConsumerNFT.transferFrom transaction
 * using the connected wallet — no simulation, no fake tx hash. Returns as
 * soon as the wallet returns a transaction hash; does not wait for
 * confirmation (that's the caller's job via lib/consumer/chain/watch-transaction).
 */
export async function transferProductOwnership(input: {
  wallet: EthereumWalletLike;
  productIdHash: `0x${string}`;
  fromWalletAddress: `0x${string}`;
  toWalletAddress: `0x${string}`;
  nftContractAddress: `0x${string}`;
}): Promise<{ txHash: `0x${string}` }> {
  const walletClient = await getWalletClient(input.wallet);

  const data = encodeFunctionData({
    abi: consumerNftAbi,
    functionName: "transferFrom",
    args: [input.fromWalletAddress, input.toWalletAddress, input.productIdHash],
  });

  try {
    const txHash = await walletClient.sendTransaction({
      chain: HEDERA_TESTNET,
      account: input.fromWalletAddress,
      to: input.nftContractAddress,
      data,
      gas: TRANSFER_GAS_LIMIT,
    });
    return { txHash };
  } catch (error) {
    if (isUserRejection(error)) throw new SignatureRejectedError();
    throw error;
  }
}
