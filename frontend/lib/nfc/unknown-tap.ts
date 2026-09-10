import type { NfcTapPayload } from "@/lib/types";

/** Invalid tap used by the simulator. Contains no key material. */
export const UNKNOWN_TAP_PAYLOAD: NfcTapPayload = {
  tag_uid: "04FFFFFFFFFF",
  nonce: "00",
  cmac: "00",
};
