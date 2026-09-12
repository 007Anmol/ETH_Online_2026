import {
  decodeErrorResult,
  encodeFunctionData,
  toHex,
  type Abi,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";
import { hedera } from "./wagmi";
import { publicClient } from "./clients";

const FALLBACK_GAS_PRICE = 1_210_000_000_000n;

/**
 * Hashio rejects EIP-1559 (type 2) txs and batched JSON-RPC from MetaMask/viem.
 * Force a legacy tx with an explicit gas limit so createBatch/mint/escrow can land.
 */
export async function hederaFeeOverrides(): Promise<{
  chain: typeof hedera;
  type: "legacy";
  gas: bigint;
  gasPrice: bigint;
}> {
  let gasPrice = FALLBACK_GAS_PRICE;
  try {
    const quoted = await publicClient.getGasPrice();
    if (quoted > 0n) gasPrice = quoted;
  } catch {
    // Keep the Hashio-safe fallback.
  }

  return {
    chain: hedera,
    type: "legacy",
    gas: 2_000_000n,
    gasPrice,
  };
}

export function mapHederaRpcError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("0x128") ||
    /HTTP client error/i.test(message) ||
    /eth_sendRawTransaction/i.test(message)
  ) {
    return new Error(
      "Hashio rejected the signed transaction (RPC 0x128). Stay on Hedera Testnet (296) and retry. If this batch already exists, switch to Mint products or use a new batch code.",
    );
  }
  return error instanceof Error ? error : new Error(message);
}

type HederaCall = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};

function explainDecodedRevert(abi: Abi, data: Hex): string | null {
  try {
    const decoded = decodeErrorResult({ abi, data });
    if (decoded.errorName === "ProductAlreadyMinted") {
      return "Mint reverted: ProductAlreadyMinted. That product hash already exists on VeriChainRegistry (product ids are global, not per-batch). Use a new product code.";
    }
    if (decoded.errorName === "BatchNotFound") {
      return "Mint reverted: BatchNotFound. Create the batch on Hedera first.";
    }
    if (decoded.errorName === "OverMint") {
      return "Mint reverted: OverMint. This batch has no remaining quantity.";
    }
    if (decoded.errorName === "Unauthorized") {
      return "Transaction reverted: Unauthorized. Connect the registry owner wallet.";
    }
    return `Contract reverted: ${decoded.errorName}${decoded.args?.length ? ` ${decoded.args.join(" ")}` : ""}`;
  } catch {
    return null;
  }
}

function explainSimulateError(error: unknown, abi: Abi): Error {
  const err = error as {
    message?: string;
    data?: { errorName?: string };
    cause?: { data?: Hex };
  };
  const revertData = err.cause?.data;
  if (revertData) {
    const decoded = explainDecodedRevert(abi, revertData);
    if (decoded) return new Error(decoded);
  }
  if (err.data?.errorName === "ProductAlreadyMinted") {
    return new Error(
      "Mint reverted: ProductAlreadyMinted. That product hash already exists on VeriChainRegistry. Use a new product code.",
    );
  }
  if (err.data?.errorName) {
    return new Error(`Contract reverted: ${err.data.errorName}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function explainReceiptRevert(hash: Hex, abi: Abi): Promise<Error> {
  const network = hedera.id === 295 ? "mainnet" : "testnet";
  try {
    const res = await fetch(`https://${network}.mirrornode.hedera.com/api/v1/contracts/results/${hash}`);
    if (res.ok) {
      const body = (await res.json()) as { error_message?: string | null };
      if (body.error_message && body.error_message !== "0x") {
        const decoded = explainDecodedRevert(abi, body.error_message as Hex);
        if (decoded) return new Error(`${decoded} Tx ${hash}`);
      }
    }
  } catch {
    // Fall through to generic revert.
  }
  return new Error(
    `Hedera transaction reverted (CONTRACT_REVERT_EXECUTED). Off-chain records were not updated. Tx ${hash}`,
  );
}

/**
 * Send a type-0 tx through MetaMask without letting viem/wagmi attach EIP-1559 fields.
 * A mined revert is treated as failure so callers do not sync Supabase.
 */
export async function sendHederaWalletCall(
  walletClient: WalletClient,
  call: HederaCall,
): Promise<Hex> {
  const from = walletClient.account?.address;
  if (!from) throw new Error("Wallet account is not ready.");

  try {
    await publicClient.simulateContract({
      address: call.address,
      abi: call.abi,
      functionName: call.functionName,
      args: call.args,
      value: call.value,
      account: from,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const rpcNoise = /HTTP client error|timeout|fetch|\[object Object\]/i.test(message);
    if (!rpcNoise) throw explainSimulateError(error, call.abi);
  }

  const fees = await hederaFeeOverrides();
  const data = encodeFunctionData({
    abi: call.abi,
    functionName: call.functionName,
    args: call.args,
  });

  let hash: Hex;
  try {
    hash = await walletClient.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to: call.address,
          data,
          gas: toHex(fees.gas),
          gasPrice: toHex(fees.gasPrice),
          value: toHex(call.value ?? 0n),
          type: "0x0",
        },
      ],
    });
  } catch (error) {
    throw mapHederaRpcError(error);
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw await explainReceiptRevert(hash, call.abi);
  }
  return hash;
}
