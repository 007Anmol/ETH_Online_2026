/**
 * Team 1 blockchain integration surface.
 * Prefer importing from `@/lib/blockchain` rather than calling contracts from components.
 */
export { config, hedera } from "./wagmi";
export { publicClient } from "./clients";
export {
  CONTRACTS,
  getRegistryAddress,
  hasRegistryAddress,
  registryAbi,
} from "./contracts";
export {
  deriveNonceHash,
  deriveOnChainId,
  isTagUid,
  looksLikeUuid,
  normalizeTagUid,
} from "./hashes";
export type {
  Hex32,
  ManufacturerPermission,
  OnChainBatch,
  OnChainProduct,
  OnChainTag,
  OrganizationRow,
  ProfileRow,
  UserRole,
} from "./types";
export { BatchStatus, TagStatus } from "./types";
export {
  bindTagOnChain,
  consumeNonceOnChain,
  createBatchOnChain,
  isTagBound,
  mintBatchOnChain,
  readBatch,
  readIsNonceConsumed,
  readProduct,
  readRegistryOwner,
  readTag,
  revokeTagOnChain,
} from "./registry";
