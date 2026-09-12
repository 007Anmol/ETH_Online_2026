/** Hedera testnet. Do not invent extra networks here. */
export const HEDERA_TESTNET_CHAIN_ID = 296;
export const HEDERA_TESTNET_RPC_URL = "https://testnet.hashio.io/api";

/** Frozen VeriChainRegistry on Hedera testnet. Do not redeploy for app writes. */
export const HEDERA_REGISTRY_ADDRESS =
  "0x2ffe6b68f7a840b3d92fdc2b3f7958ce0c0253c5" as const;
export const HEDERA_REGISTRY_CONTRACT_ID = "0.0.10394090";
export const HEDERA_REGISTRY_HASHSCAN_URL =
  "https://hashscan.io/testnet/contract/0.0.10394090";

/**
 * Frozen Team 3 Consumer contracts on Hedera testnet (see
 * frontend/CONSUMER_BACKEND_PLAN.md's deployment record for the live
 * mint/list/buy/cancel/double-buy/blocked verification against these exact
 * addresses). Do not redeploy for app writes — a redeploy orphans that
 * verification and every existing on-chain token/listing.
 */
export const HEDERA_CONSUMER_NFT_ADDRESS =
  "0xF217e76F80a2743769B3f6D51bE1F1B6C2cC7b49" as const;
export const HEDERA_CONSUMER_MARKETPLACE_ADDRESS =
  "0xCC98075D05c02a7f136ff534bB01C5bE4476da4F" as const;

/**
 * Hedera's EVM delivers `msg.value` to a contract in tinybar units (8
 * decimals) even though a standard viem/ethers transaction's `value` field
 * is denominated the normal 18-decimal ("wei"/"weibar") way — confirmed by
 * live testing (see CONSUMER_BACKEND_PLAN.md). A `VeriChainMarketplace`
 * listing price must be set in tinybar units; the transaction's `value`
 * field sent by a wallet/viem stays in the normal 18-decimal HBAR
 * convention (i.e. `parseEther("2")` for 2 HBAR) — do not convert it
 * yourself when submitting a transaction, only when reading/writing a
 * contract `price`. Use `hbarToTinybars`/`tinybarsToHbar` in
 * `services/hedera/src/consumer.ts` rather than hand-rolling this
 * conversion at a call site.
 */
export const HEDERA_TINYBARS_PER_HBAR = 100_000_000n;
