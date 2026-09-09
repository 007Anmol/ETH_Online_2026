import { json, readJson } from "@/lib/api/http";
import { nfcActorId } from "@/lib/nfc/actor";
import { revokeTag } from "@/lib/nfc/revoke-tag";
import { requireManufacturer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";

type RevokeInput = {
  tag_id: string;
  reason: string;
};

export async function POST(request: Request) {
  const parsed = await readJson<RevokeInput>(request);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);
  const body = parsed.body;

  const authorization = await requireManufacturer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { session } = authorization;

  const result = await revokeTag(createServiceClient(), {
    tag_id: body.tag_id ?? "",
    reason: body.reason ?? "Revoked by manufacturer",
    performed_by: nfcActorId(session),
  });

  if (!result.ok) {
    return json({ error: result.error }, result.status);
  }

  return json(result);
}
