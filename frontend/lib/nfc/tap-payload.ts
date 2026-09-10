import { normalizeTagUid } from "@/lib/crypto/hash";
import { aesCmac, parseAes128Key } from "@/lib/nfc/cmac";
import type { NfcTapPayload } from "@/lib/types";

const FALLBACK_NFC_MASTER_KEY = "00112233445566778899aabbccddeeff";

function masterKey(): Buffer {
  return parseAes128Key(process.env.NFC_MASTER_KEY ?? FALLBACK_NFC_MASTER_KEY);
}

function message(tagUid: string, nonce: string): Buffer {
  return Buffer.from(`${tagUid}:${nonce}`, "utf8");
}

export function signTapPayload(tagUid: string, nonce: string): NfcTapPayload {
  const uid = normalizeTagUid(tagUid);
  const cmac = aesCmac(masterKey(), message(uid, nonce)).toString("hex");
  return { tag_uid: uid, nonce, cmac };
}

export function tapCmacIsValid(payload: NfcTapPayload): boolean {
  const uid = normalizeTagUid(payload.tag_uid);
  const expected = aesCmac(masterKey(), message(uid, payload.nonce)).toString(
    "hex",
  );
  return expected === payload.cmac.trim().toLowerCase();
}
