import { keccak256, stringToBytes } from "viem";

/** keccak256 of the UTF-8 bytes. Same preimage as Solidity keccak256(bytes(value)). */
export function placeholderHash(value: string): `0x${string}` {
  return keccak256(stringToBytes(value));
}

export function normalizeTagUid(tagUid: string): string {
  return tagUid.trim().replace(/^0x/i, "").replace(/[\s:-]/g, "").toUpperCase();
}

export function isTagUid(value: string): boolean {
  return /^[0-9A-F]{8,20}$/.test(value);
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string) {
  return UUID_RE.test(value);
}
