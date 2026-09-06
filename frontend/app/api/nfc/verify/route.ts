import { notImplemented } from "@/lib/api/http";

/** Saachi: accept/reject a tap. UI must never decide AUTHENTIC vs DUPLICATE. */
export async function POST() {
  return notImplemented("Saachi", "POST /api/nfc/verify");
}
