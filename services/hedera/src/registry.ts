/**
 * Team 1 identity writes to VeriChainRegistry.
 * Call these from API routes / lib — never from the browser.
 * Implement after the contract is deployed. Do not duplicate this in frontend/lib.
 */

export type RegistryTx = {
  txHash: string;
};

export type CreateBatchOnChainInput = {
  batchIdHash: `0x${string}`;
  quantity: number;
};

export type MintBatchOnChainInput = {
  batchIdHash: `0x${string}`;
  quantity: number;
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

function notWired(name: string): never {
  throw new Error(
    `${name} is not wired to Hedera yet. Deploy VeriChainRegistry first.`,
  );
}

export async function createBatchOnChain(
  _input: CreateBatchOnChainInput,
): Promise<RegistryTx> {
  return notWired("createBatchOnChain");
}

export async function mintBatchOnChain(
  _input: MintBatchOnChainInput,
): Promise<RegistryTx> {
  return notWired("mintBatchOnChain");
}

export async function bindTagOnChain(
  _input: BindTagOnChainInput,
): Promise<RegistryTx> {
  return notWired("bindTagOnChain");
}

export async function revokeTagOnChain(
  _input: RevokeTagOnChainInput,
): Promise<RegistryTx> {
  return notWired("revokeTagOnChain");
}

export async function consumeNonceOnChain(
  _input: ConsumeNonceOnChainInput,
): Promise<RegistryTx> {
  return notWired("consumeNonceOnChain");
}
