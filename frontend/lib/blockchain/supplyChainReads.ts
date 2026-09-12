import { CONTRACTS } from "@/lib/contracts";
import { legacySupplyChainAbi } from "@/lib/team2/legacySupplyChainAbi";
import { escrowAbi } from "@/lib/escrowAbi";
import { publicClient } from "./clients";

export type OnChainShipment = readonly [
  bigint,
  bigint,
  `0x${string}`,
  `0x${string}`,
  number,
  boolean,
];

export type OnChainEscrow = readonly [bigint, `0x${string}`, `0x${string}`, bigint, number];

/** Walk recent shipments (newest first) for this logistics product id. */
export async function findLatestShipmentForProduct(productId: bigint): Promise<OnChainShipment | null> {
  if (!CONTRACTS.supplyChain || productId <= 0n) return null;

  const next = (await publicClient.readContract({
    address: CONTRACTS.supplyChain,
    abi: legacySupplyChainAbi,
    functionName: "nextShipmentId",
  })) as bigint;

  const start = next > 1n ? next - 1n : 0n;
  const floor = start > 20n ? start - 19n : 1n;

  for (let id = start; id >= floor; id--) {
    const row = (await publicClient.readContract({
      address: CONTRACTS.supplyChain,
      abi: legacySupplyChainAbi,
      functionName: "shipments",
      args: [id],
    })) as OnChainShipment;
    if (row[5] && row[1] === productId) return row;
  }

  return null;
}

export async function findLatestEscrowForProduct(productId: bigint): Promise<{ id: bigint; row: OnChainEscrow } | null> {
  if (!CONTRACTS.escrow || productId <= 0n) return null;

  const next = (await publicClient.readContract({
    address: CONTRACTS.escrow,
    abi: escrowAbi,
    functionName: "nextEscrowId",
  })) as bigint;

  const start = next > 1n ? next - 1n : 0n;
  const floor = start > 20n ? start - 19n : 1n;

  for (let id = start; id >= floor; id--) {
    const row = (await publicClient.readContract({
      address: CONTRACTS.escrow,
      abi: escrowAbi,
      functionName: "escrows",
      args: [id],
    })) as OnChainEscrow;
    if (row[0] === productId && (row[3] > 0n || row[4] > 0)) {
      return { id, row };
    }
  }

  return null;
}
