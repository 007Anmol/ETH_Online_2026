/** Hedera testnet. Do not invent extra networks here. */
export const HEDERA_TESTNET_CHAIN_ID = 296;
export const HEDERA_TESTNET_RPC_URL = "https://testnet.hashio.io/api";

/** Frozen VeriChainRegistry on Hedera testnet. Do not redeploy for app writes. */
export const HEDERA_REGISTRY_ADDRESS =
  "0xd01d7972cD8B14B28b61e1e4709227923A3b464b" as const;
export const HEDERA_REGISTRY_CONTRACT_ID = "0.0.10394090";
export const HEDERA_REGISTRY_HASHSCAN_URL =
  "https://hashscan.io/testnet/contract/0.0.10394090";
