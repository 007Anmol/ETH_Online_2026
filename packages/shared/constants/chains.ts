/** Hedera testnet. Do not invent extra networks here. */
export const HEDERA_TESTNET_CHAIN_ID = 296;
export const HEDERA_TESTNET_RPC_URL = "https://testnet.hashio.io/api";

/** Frozen VeriChainRegistry on Hedera testnet. Do not redeploy for app writes. */
export const HEDERA_REGISTRY_ADDRESS =
  "0x2ffe6b68f7a840b3d92fdc2b3f7958ce0c0253c5" as const;
export const HEDERA_REGISTRY_CONTRACT_ID = "0.0.10395170";
export const HEDERA_REGISTRY_HASHSCAN_URL =
  "https://hashscan.io/testnet/contract/0.0.10395170";
