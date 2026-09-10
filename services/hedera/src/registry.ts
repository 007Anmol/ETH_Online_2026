/**
 * Identity writes to VeriChainRegistry.
 * Call these from API routes / lib — never from the browser.
 */

import registryAbiJson from "../../../packages/shared/abi/VeriChainRegistry.json";
import { getHederaConfig, sendContractCall } from "./client";
import type { Abi, Address } from "viem";

const registryAbi = registryAbiJson as Abi;

export type RegistryTx = {
  txHash: `0x${string}`;
};

export type CreateBatchOnChainInput = {
  batchIdHash: `0x${string}`;
  quantity: number;
};

export type MintBatchOnChainInput = {
  batchIdHash: `0x${string}`;
  productIdHashes: `0x${string}`[];
};

export type BindTagOnChainInput = {
  productIdHash: `0x${string}`;
  tagIdHash: `0x${string}`;
};

export type RevokeTagOnChainInput = {
  tagIdHash: `0x${string}`;
};

export type ConsumeNonceOnChainInput = {
  tagIdHash: `0x${string}`;
  nonceHash: `0x${string}`;
};

async function writeRegistry(
  functionName: string,
  args: readonly unknown[],
): Promise<RegistryTx> {
  const { registryAddress } = getHederaConfig();
  const result = await sendContractCall({
    address: registryAddress as Address,
    abi: registryAbi,
    functionName,
    args,
  });
  if (!result.ok) {
    throw new Error(result.revertReason);
  }
  return { txHash: result.txHash };
}

export async function createBatchOnChain(
  input: CreateBatchOnChainInput,
): Promise<RegistryTx> {
  return writeRegistry("createBatch", [input.batchIdHash, input.quantity]);
}

export async function mintBatchOnChain(
  input: MintBatchOnChainInput,
): Promise<RegistryTx> {
  return writeRegistry("mintBatch", [input.batchIdHash, input.productIdHashes]);
}

export async function bindTagOnChain(
  input: BindTagOnChainInput,
): Promise<RegistryTx> {
  return writeRegistry("bindTag", [input.productIdHash, input.tagIdHash]);
}

export async function revokeTagOnChain(
  input: RevokeTagOnChainInput,
): Promise<RegistryTx> {
  return writeRegistry("revokeTag", [input.tagIdHash]);
}

export async function consumeNonceOnChain(
  input: ConsumeNonceOnChainInput,
): Promise<RegistryTx> {
  return writeRegistry("consumeNonce", [input.tagIdHash, input.nonceHash]);
}
