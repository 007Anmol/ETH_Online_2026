import { json, readJson } from "@/lib/api/http";
import { nfcActorId } from "@/lib/nfc/actor";
import { verifyTap } from "@/lib/nfc/verify-tap";
import { getSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import type { NfcTapPayload } from "@/lib/types";

export async function POST(request: Request) {
  const parsed = await readJson<NfcTapPayload>(request);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);
  const body = parsed.body;

  const session = await getSession();
  const result = await verifyTap(createServiceClient(), {
    tag_uid: body.tag_uid ?? "",
    nonce: body.nonce ?? "",
    cmac: body.cmac ?? "",
    scanned_by: nfcActorId(session),
  });

  const { httpStatus, ...response } = result;
  return json(response, httpStatus);
}
