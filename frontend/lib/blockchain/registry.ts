import type { Account, Address, Hex, WalletClient } from "viem";
import { publicClient } from "./clients";
import { getRegistryAddress, registryAbi } from "./contracts";
import { deriveNonceHash, deriveOnChainId, normalizeTagUid } from "./hashes";
import {
  BatchStatus,
  TagStatus,
  type Hex32,
  type OnChainBatch,
  type OnChainProduct,
  type OnChainTag,
} from "./types";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex32;

function asHex32(value: unknown): Hex32 {
  return value as Hex32;
}

export async function readBatch(batchIdHash: Hex32): Promise<OnChainBatch> {
  const result = await publicClient.readContract({
    address: getRegistryAddress(),
    abi: registryAbi,
    functionName: "getBatch",
    args: [batchIdHash],
  });
  const [exists, quantity, mintedCount, status] = result as [boolean, number, number, number];
  return {
    exists,
    quantity: Number(quantity),
    mintedCount: Number(mintedCount),
    status: status as BatchStatus,
  };
}

export async function readProduct(productIdHash: Hex32): Promise<OnChainProduct> {
  const result = await publicClient.readContract({
    address: getRegistryAddress(),
    abi: registryAbi,
    functionName: "getProduct",
    args: [productIdHash],
  });
  const [exists, batchIdHash, boundTagIdHash] = result as [boolean, Hex, Hex];
  return {
    exists,
    batchIdHash: asHex32(batchIdHash),
    boundTagIdHash: asHex32(boundTagIdHash),
  };
}

export async function readTag(tagIdHash: Hex32): Promise<OnChainTag> {
  const result = await publicClient.readContract({
    address: getRegistryAddress(),
    abi: registryAbi,
    functionName: "getTag",
    args: [tagIdHash],
  });
  const [exists, status, productIdHash] = result as [boolean, number, Hex];
  return {
    exists,
    status: status as TagStatus,
    productIdHash: asHex32(productIdHash),
  };
}

export async function readIsNonceConsumed(nonceHash: Hex32): Promise<boolean> {
  return (await publicClient.readContract({
    address: getRegistryAddress(),
    abi: registryAbi,
    functionName: "isNonceConsumed",
    args: [nonceHash],
  })) as boolean;
}

export async function readRegistryOwner(): Promise<Address> {
  return (await publicClient.readContract({
    address: getRegistryAddress(),
    abi: registryAbi,
    functionName: "owner",
    args: [],
  })) as Address;
}

type WriteClient = WalletClient & { account: Account };

async function writeRegistry(
  walletClient: WriteClient,
  functionName: string,
  args: readonly unknown[],
): Promise<Hex> {
  const account = walletClient.account;
  const hash = await walletClient.writeContract({
    address: getRegistryAddress(),
    abi: registryAbi,
    functionName,
    args,
    account,
    chain: walletClient.chain,
  });
  return hash;
}

/**
 * Owner-only Team 1 writes. Ordinary logistics wallets cannot call these.
 * Prefer server/operator flows for production; browser owner wallet is OK for hackathon demos.
 */
export async function createBatchOnChain(
  walletClient: WriteClient,
  input: { batchCode: string; quantity: number },
): Promise<{ txHash: Hex; batchIdHash: Hex32 }> {
  const batchIdHash = deriveOnChainId(input.batchCode);
  const txHash = await writeRegistry(walletClient, "createBatch", [
    batchIdHash,
    input.quantity,
  ]);
  return { txHash, batchIdHash };
}

export async function mintBatchOnChain(
  walletClient: WriteClient,
  input: { batchCode: string; productCodes: string[] },
): Promise<{ txHash: Hex; batchIdHash: Hex32; productIdHashes: Hex32[] }> {
  const batchIdHash = deriveOnChainId(input.batchCode);
  const productIdHashes = input.productCodes.map((code) => deriveOnChainId(code));
  const txHash = await writeRegistry(walletClient, "mintBatch", [
    batchIdHash,
    productIdHashes,
  ]);
  return { txHash, batchIdHash, productIdHashes };
}

export async function bindTagOnChain(
  walletClient: WriteClient,
  input: { productCode: string; tagUid: string },
): Promise<{ txHash: Hex; productIdHash: Hex32; tagIdHash: Hex32 }> {
  const productIdHash = deriveOnChainId(input.productCode);
  const tagIdHash = deriveOnChainId(normalizeTagUid(input.tagUid));
  const txHash = await writeRegistry(walletClient, "bindTag", [productIdHash, tagIdHash]);
  return { txHash, productIdHash, tagIdHash };
}

export async function revokeTagOnChain(
  walletClient: WriteClient,
  input: { tagUid: string },
): Promise<{ txHash: Hex; tagIdHash: Hex32 }> {
  const tagIdHash = deriveOnChainId(normalizeTagUid(input.tagUid));
  const txHash = await writeRegistry(walletClient, "revokeTag", [tagIdHash]);
  return { txHash, tagIdHash };
}

/**
 * Owner-only. Do not expose this as a logistics/frontend wallet action.
 * NFC verify backends / operator services should call consumeNonce.
 */
export async function consumeNonceOnChain(
  walletClient: WriteClient,
  input: { tagUid: string; nonce: string },
): Promise<{ txHash: Hex; tagIdHash: Hex32; nonceHash: Hex32 }> {
  const tagUid = normalizeTagUid(input.tagUid);
  const tagIdHash = deriveOnChainId(tagUid);
  const nonceHash = deriveNonceHash(tagUid, input.nonce);
  const txHash = await writeRegistry(walletClient, "consumeNonce", [tagIdHash, nonceHash]);
  return { txHash, tagIdHash, nonceHash };
}

export function isTagBound(product: OnChainProduct): boolean {
  return product.exists && product.boundTagIdHash !== ZERO_BYTES32;
}

export { BatchStatus, TagStatus, deriveOnChainId, deriveNonceHash, normalizeTagUid };
