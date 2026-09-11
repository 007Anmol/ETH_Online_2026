import { keccak256, stringToBytes } from "viem";

/**
 * Canonical Team 1 on-chain id.
 * Matches Solidity: keccak256(bytes(value)) / forge tests in VeriChainRegistry.t.sol
 */
export function deriveOnChainId(value: string): `0x${string}` {
  return keccak256(stringToBytes(value));
}

/** Normalize NTAG UID to uppercase hex without 0x / separators. */
export function normalizeTagUid(tagUid: string): string {
  return tagUid.trim().replace(/^0x/i, "").replace(/[\s:-]/g, "").toUpperCase();
}

export function isTagUid(value: string): boolean {
  return /^[0-9A-F]{8,20}$/.test(normalizeTagUid(value));
}

/**
 * Nonce hash preimage used by Team 1 NFC verify: `${normalizedTagUid}:${nonce}`
 * See Manufacturing verify-tap + forge nonceHash = keccak256(bytes("04DEADBEEF01:nonce-1"))
 */
export function deriveNonceHash(tagUid: string, nonce: string): `0x${string}` {
  const uid = normalizeTagUid(tagUid);
  return deriveOnChainId(`${uid}:${nonce}`);
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string): boolean {
  return UUID_RE.test(value);
}
