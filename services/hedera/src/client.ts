import { HEDERA_TESTNET_CHAIN_ID } from "@verichain/shared";

/**
 * Team 1 — Hedera testnet operator.
 * Reads server env only. Do not import this from client components.
 */
export type HederaOperatorConfig = {
  rpcUrl: string;
  chainId: number;
  operatorPrivateKey: string;
  operatorAddress: string;
  operatorAccountId: string | null;
};

export function getHederaConfig(): HederaOperatorConfig {
  const rpcUrl =
    process.env.HEDERA_TESTNET_RPC_URL?.trim() ||
    "https://testnet.hashio.io/api";
  const chainId = Number(
    process.env.HEDERA_TESTNET_CHAIN_ID ?? HEDERA_TESTNET_CHAIN_ID,
  );
  const operatorPrivateKey =
    process.env.HEDERA_OPERATOR_PRIVATE_KEY?.trim() ?? "";
  const operatorAddress = process.env.HEDERA_OPERATOR_ADDRESS?.trim() ?? "";
  const operatorAccountId =
    process.env.HEDERA_OPERATOR_ACCOUNT_ID?.trim() || null;

  if (!operatorPrivateKey || !operatorAddress) {
    throw new Error(
      "Hedera operator is not configured. Set HEDERA_OPERATOR_PRIVATE_KEY and HEDERA_OPERATOR_ADDRESS.",
    );
  }

  return {
    rpcUrl,
    chainId: Number.isFinite(chainId) ? chainId : HEDERA_TESTNET_CHAIN_ID,
    operatorPrivateKey,
    operatorAddress,
    operatorAccountId,
  };
}
