export const CONTRACTS = {
  registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}`,
  escrow: process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`,
  hook: process.env.NEXT_PUBLIC_HOOK_ADDRESS as `0x${string}`,
} as const;