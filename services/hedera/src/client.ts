import {
  HEDERA_REGISTRY_ADDRESS,
  HEDERA_TESTNET_CHAIN_ID,
  HEDERA_TESTNET_RPC_URL,
} from "@verichain/shared";
import {
  createPublicClient,
  createWalletClient,
  decodeErrorResult,
  defineChain,
  encodeFunctionData,
  http,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Team 1 — Hedera testnet operator.
 * Reads server env only. Do not import this from client components.
 */
export type HederaOperatorConfig = {
  rpcUrl: string;
  chainId: number;
  operatorPrivateKey: `0x${string}`;
  operatorAddress: Address;
  operatorAccountId: string | null;
  registryAddress: Address;
};

export type SendContractCallInput = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
};

export type ContractCallResult =
  | { ok: true; txHash: `0x${string}` }
  | { ok: false; revertReason: string };

function asHex(value: string): `0x${string}` {
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
}

export function getHederaConfig(): HederaOperatorConfig {
  const rpcUrl =
    process.env.HEDERA_TESTNET_RPC_URL?.trim() || HEDERA_TESTNET_RPC_URL;
  const chainId = Number(
    process.env.HEDERA_TESTNET_CHAIN_ID ?? HEDERA_TESTNET_CHAIN_ID,
  );
  const operatorPrivateKey = process.env.HEDERA_OPERATOR_PRIVATE_KEY?.trim() ?? "";
  const operatorAddress = process.env.HEDERA_OPERATOR_ADDRESS?.trim() ?? "";
  const operatorAccountId =
    process.env.HEDERA_OPERATOR_ACCOUNT_ID?.trim() || null;
  const registryAddress =
    process.env.HEDERA_REGISTRY_ADDRESS?.trim() || HEDERA_REGISTRY_ADDRESS;

  if (!operatorPrivateKey || !operatorAddress) {
    throw new Error(
      "Hedera operator is not configured. Set HEDERA_OPERATOR_PRIVATE_KEY and HEDERA_OPERATOR_ADDRESS.",
    );
  }
  if (!registryAddress) {
    throw new Error(
      "Hedera registry is not configured. Set HEDERA_REGISTRY_ADDRESS.",
    );
  }

  return {
    rpcUrl,
    chainId: Number.isFinite(chainId) ? chainId : HEDERA_TESTNET_CHAIN_ID,
    operatorPrivateKey: asHex(operatorPrivateKey),
    operatorAddress: operatorAddress as Address,
    operatorAccountId,
    registryAddress: registryAddress as Address,
  };
}

function hederaChain(rpcUrl: string, chainId: number) {
  return defineChain({
    id: chainId,
    name: "Hedera Testnet",
    nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
    blockExplorers: {
      default: { name: "HashScan", url: "https://hashscan.io/testnet" },
    },
  });
}

function decodeRevert(abi: Abi, data: Hex | undefined, fallback: string): string {
  if (!data || data === "0x") return fallback;
  try {
    const decoded = decodeErrorResult({ abi, data });
    const args = decoded.args?.length
      ? `(${decoded.args.map((value) => String(value)).join(", ")})`
      : "";
    return `${decoded.errorName}${args}`;
  } catch {
    return fallback;
  }
}

function findRevertData(error: unknown, depth = 0): Hex | undefined {
  if (!error || depth > 6) return undefined;
  if (typeof error === "string" && /^0x[0-9a-fA-F]{8,}$/.test(error)) {
    return error as Hex;
  }
  if (typeof error !== "object") return undefined;
  const candidate = error as { data?: unknown; cause?: unknown };
  if (typeof candidate.data === "string" && candidate.data.startsWith("0x")) {
    return candidate.data as Hex;
  }
  if (candidate.data && typeof candidate.data === "object") {
    const nested = candidate.data as { data?: unknown };
    if (typeof nested.data === "string" && nested.data.startsWith("0x")) {
      return nested.data as Hex;
    }
  }
  return findRevertData(candidate.cause, depth + 1);
}

function revertFromUnknown(error: unknown, abi: Abi): string {
  const data = findRevertData(error);
  const fallback =
    error && typeof error === "object"
      ? (error as { shortMessage?: string; message?: string }).shortMessage ||
        (error as { message?: string }).message ||
        "transaction reverted"
      : error instanceof Error
        ? error.message
        : String(error);
  return decodeRevert(abi, data, fallback);
}

/**
 * One server-side write path for every API. Signs with the operator key,
 * waits for the receipt, and returns the tx hash or a revert reason.
 * Do not call this from the browser.
 */
export async function sendContractCall(
  input: SendContractCallInput,
): Promise<ContractCallResult> {
  const config = getHederaConfig();
  const chain = hederaChain(config.rpcUrl, config.chainId);
  const account = privateKeyToAccount(config.operatorPrivateKey);
  const transport = http(config.rpcUrl);

  const publicClient = createPublicClient({
    chain,
    transport,
    pollingInterval: 2_000,
  });
  const walletClient = createWalletClient({
    account,
    chain,
    transport,
  });

  const data = encodeFunctionData({
    abi: input.abi,
    functionName: input.functionName,
    args: input.args,
  });

  async function revertReason(error: unknown): Promise<string> {
    try {
      await publicClient.call({
        to: input.address,
        data,
        account: account.address,
      });
    } catch (callError) {
      return revertFromUnknown(callError, input.abi);
    }
    return revertFromUnknown(error, input.abi);
  }

  let txHash: `0x${string}`;
  try {
    txHash = await walletClient.sendTransaction({
      account,
      to: input.address,
      data,
      type: "legacy",
      gas: 2_000_000n,
    });
  } catch (error) {
    return { ok: false, revertReason: await revertReason(error) };
  }

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 90_000,
  });

  if (receipt.status === "reverted") {
    return {
      ok: false,
      revertReason: await revertReason("transaction reverted"),
    };
  }

  return { ok: true, txHash };
}
