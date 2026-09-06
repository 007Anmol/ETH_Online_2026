import { json } from "@/lib/api/http";
import { getSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import { verifyTap } from "@/lib/nfc/verify-tap";

export async function POST(request: Request) {
  let body: { tag_uid?: string; nonce?: string; cmac?: string };
  try {
    body = (await request.json()) as {
      tag_uid?: string;
      nonce?: string;
      cmac?: string;
    };
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const session = await getSession();
  const result = await verifyTap(createServiceClient(), {
    tag_uid: body.tag_uid ?? "",
    nonce: body.nonce ?? "",
    cmac: body.cmac ?? "",
    scanned_by:
      session?.profileId && session.profileId !== "local-demo-profile"
        ? session.profileId
        : null,
  });

  const { httpStatus, ...response } = result;
  return json(response, httpStatus);
}
