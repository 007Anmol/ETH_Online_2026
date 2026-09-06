import { json } from "@/lib/api/http";
import { simulateTap } from "@/lib/nfc/simulate-tap";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: Request) {
  let body: { tag_uid?: string; product_id?: string };
  try {
    body = (await request.json()) as { tag_uid?: string; product_id?: string };
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const result = await simulateTap(createServiceClient(), {
    tag_uid: body.tag_uid,
    product_id: body.product_id,
  });

  if (!result.ok) {
    return json({ error: result.error }, result.status);
  }

  return json(result);
}
