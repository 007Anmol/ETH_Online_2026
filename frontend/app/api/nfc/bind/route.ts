import { json } from "@/lib/api/http";
import { bindTag } from "@/lib/nfc/bind-tag";
import { getSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import { isManufacturerRole } from "@/lib/types";

export async function POST(request: Request) {
  let body: { product_id?: string; tag_uid?: string };
  try {
    body = (await request.json()) as { product_id?: string; tag_uid?: string };
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const session = await getSession();
  if (!session || !isManufacturerRole(session.role)) {
    return json({ error: "Manufacturer login required to bind a tag" }, 401);
  }

  const result = await bindTag(createServiceClient(), {
    product_id: body.product_id ?? "",
    tag_uid: body.tag_uid ?? "",
    performed_by:
      session?.profileId && session.profileId !== "local-demo-profile"
        ? session.profileId
        : null,
  });

  if (!result.ok) {
    return json({ error: result.error }, result.status);
  }

  return json(result);
}
