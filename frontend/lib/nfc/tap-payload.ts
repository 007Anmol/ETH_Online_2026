import { DEMO_NFC_MASTER_KEY } from "@/lib/constants";
import { normalizeTagUid } from "@/lib/crypto/hash";
import { aesCmac, parseAes128Key } from "@/lib/nfc/cmac";
import type { NfcTapPayload } from "@/lib/types";

function masterKey(): Buffer {
  return parseAes128Key(process.env.NFC_MASTER_KEY ?? DEMO_NFC_MASTER_KEY);
}

function message(tagUid: string, nonce: string): Buffer {
  return Buffer.from(`${tagUid}:${nonce}`, "utf8");
}

export function signTapPayload(tagUid: string, nonce: string): NfcTapPayload {
  const uid = normalizeTagUid(tagUid);
  const cmac = aesCmac(masterKey(), message(uid, nonce)).toString("hex");
  return { tag_uid: uid, nonce, cmac };
}

/** Used by the simulator and tests. Not a real chip. */
export const UNKNOWN_TAP_PAYLOAD: NfcTapPayload = {
  tag_uid: "04FFFFFFFFFF",
  nonce: "00",
  cmac: "00",
};

export function tapCmacIsValid(payload: NfcTapPayload): boolean {
  const uid = normalizeTagUid(payload.tag_uid);
  const expected = aesCmac(masterKey(), message(uid, payload.nonce)).toString(
    "hex",
  );
  return expected === payload.cmac.trim().toLowerCase();
}
