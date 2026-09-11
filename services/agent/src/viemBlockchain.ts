import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  stringToHex,
  defineChain,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AnomalyResult } from "../../../packages/shared/types/anomaly";
import type { TelemetryPoint } from "../../../packages/shared/types/checkpoint";
import type { BlockchainGateway } from "./blockchain";

const registryAbi = [
  { name: "recordCheckpoint", type: "function", stateMutability: "nonpayable", inputs: [{ name: "productId", type: "uint256" }, { name: "timestamp", type: "uint256" }, { name: "latitude", type: "int256" }, { name: "longitude", type: "int256" }, { name: "locationHash", type: "bytes32" }], outputs: [] },
  { name: "recordAnomaly", type: "function", stateMutability: "nonpayable", inputs: [{ name: "productId", type: "uint256" }, { name: "riskScore", type: "uint256" }, { name: "reasonHash", type: "bytes32" }], outputs: [] },
  { name: "resolveAnomaly", type: "function", stateMutability: "nonpayable", inputs: [{ name: "productId", type: "uint256" }], outputs: [] },
] as const;

const escrowAbi = [
  { name: "freezeEscrowPool", type: "function", stateMutability: "nonpayable", inputs: [{ name: "productId", type: "uint256" }], outputs: [] },
  { name: "resolveEscrow", type: "function", stateMutability: "nonpayable", inputs: [{ name: "escrowId", type: "uint256" }], outputs: [] },
  { name: "nextEscrowId", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "escrows", type: "function", stateMutability: "view", inputs: [{ name: "escrowId", type: "uint256" }], outputs: [{ type: "uint256" }, { type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint8" }] },
] as const;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function address(name: string): Address {
  return required(name) as Address;
}

async function resolveTokenId(productId: string): Promise<bigint> {
  const supabaseUrl = required("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${supabaseUrl}/rest/v1/products?select=token_id&id=eq.${encodeURIComponent(productId)}&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) throw new Error(`Product lookup failed (${response.status})`);
  const rows = (await response.json()) as Array<{ token_id: string | number | null }>;
  if (rows[0]?.token_id === null || rows[0]?.token_id === undefined) {
    throw new Error(`Product ${productId} has no token_id`);
  }
  return BigInt(rows[0].token_id);
}

export function createViemBlockchainGateway(): BlockchainGateway {
  const hedera = defineChain({
    id: Number(process.env.HEDERA_CHAIN_ID ?? "296"),
    name: "Hedera",
    nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
    rpcUrls: { default: { http: [required("HEDERA_RPC_URL")] } },
  });
  const account = privateKeyToAccount(required("HEDERA_AGENT_PRIVATE_KEY") as `0x${string}`);
  const transport = http(required("HEDERA_RPC_URL"));
  const publicClient = createPublicClient({ chain: hedera, transport });
  const walletClient = createWalletClient({ account, chain: hedera, transport });
  const registry = address("REGISTRY_ADDRESS");
  const escrow = address("ESCROW_ADDRESS");

  async function send(hash: Promise<Hash>): Promise<string> {
    const transactionHash = await hash;
    await publicClient.waitForTransactionReceipt({ hash: transactionHash });
    return transactionHash;
  }

  return {
    recordCheckpoint: async (point: TelemetryPoint) => send(walletClient.writeContract({ chain: hedera, address: registry, abi: registryAbi, functionName: "recordCheckpoint", args: [BigInt(point.productId), BigInt(point.timestamp), BigInt(Math.round(point.latitude * 1_000_000)), BigInt(Math.round(point.longitude * 1_000_000)), keccak256(stringToHex(point.checkpoint))] })),
    recordAnomaly: async (productId, result) => send(walletClient.writeContract({ chain: hedera, address: registry, abi: registryAbi, functionName: "recordAnomaly", args: [await resolveTokenId(productId), BigInt(result.riskScore), keccak256(stringToHex(result.explanation))] })),
    freezeEscrowPool: async (productId) => send(walletClient.writeContract({ chain: hedera, address: escrow, abi: escrowAbi, functionName: "freezeEscrowPool", args: [await resolveTokenId(productId)] })),
    resolveAnomaly: async (productId) => send(walletClient.writeContract({ chain: hedera, address: registry, abi: registryAbi, functionName: "resolveAnomaly", args: [await resolveTokenId(productId)] })),
    resolveEscrowPool: async (productId) => {
      const tokenId = await resolveTokenId(productId);
      const nextEscrowId = await publicClient.readContract({ address: escrow, abi: escrowAbi, functionName: "nextEscrowId" });
      let lastHash = "";
      for (let escrowId = 1n; escrowId < nextEscrowId; escrowId++) {
        const record = await publicClient.readContract({ address: escrow, abi: escrowAbi, functionName: "escrows", args: [escrowId] });
        if (record[0] === tokenId && record[4] === 1) {
          lastHash = await send(walletClient.writeContract({ chain: hedera, address: escrow, abi: escrowAbi, functionName: "resolveEscrow", args: [escrowId] }));
        }
      }
      return lastHash;
    },
  };
}