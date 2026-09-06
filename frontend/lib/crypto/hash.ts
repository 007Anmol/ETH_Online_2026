import { createHash } from "node:crypto";

/** Phase 1 stand-in. Replace with keccak256 when talking to Hedera. */
export function placeholderHash(value: string): string {
  return `0x${createHash("sha256").update(value).digest("hex")}`;
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
