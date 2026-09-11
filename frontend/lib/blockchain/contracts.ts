import type { Abi, Address } from "viem";
import registryAbiJson from "./abi/VeriChainRegistry.json";

/** Team 1 identity registry ABI (authoritative). */
export const registryAbi = registryAbiJson as Abi;

/**
 * Team 2 settlement addresses are optional until escrow/hook interfaces are finalized.
 * Do not treat missing escrow/hook addresses as a Team 1 configuration error.
 */
export const CONTRACTS = {
  registry: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as Address,
  /** @deprecated Team 2 boundary — not part of Team 1 identity. */
  escrow: (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as Address,
  /** @deprecated Team 2 boundary — not part of Team 1 identity. */
  hook: (process.env.NEXT_PUBLIC_HOOK_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as Address,
} as const;

export function getRegistryAddress(): Address {
  const address = CONTRACTS.registry;
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      "NEXT_PUBLIC_REGISTRY_ADDRESS is not configured. Deploy Team 1 VeriChainRegistry and set the address.",
    );
  }
  return address;
}

export function hasRegistryAddress(): boolean {
  const address = CONTRACTS.registry;
  return Boolean(address && address !== "0x0000000000000000000000000000000000000000");
}
