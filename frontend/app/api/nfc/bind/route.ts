import { json, readJson } from "@/lib/api/http";
import { nfcActorId } from "@/lib/nfc/actor";
import { bindTag } from "@/lib/nfc/bind-tag";
import { getSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import { isManufacturerRole, type BindTagInput } from "@/lib/types";

export async function POST(request: Request) {
  const parsed = await readJson<BindTagInput>(request);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);
  const body = parsed.body;

  const session = await getSession();
  if (!session || !isManufacturerRole(session.role)) {
    return json({ error: "Manufacturer login required to bind a tag" }, 401);
  }

  const result = await bindTag(createServiceClient(), {
    product_id: body.product_id ?? "",
    tag_uid: body.tag_uid ?? "",
    performed_by: nfcActorId(session),
  });

  if (!result.ok) {
    return json({ error: result.error }, result.status);
  }

  return json(result);
}
