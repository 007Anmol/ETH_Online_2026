import { json, readJson } from "@/lib/api/http";
import { createBatch, manufacturerBatchesQuery } from "@/lib/manufacturing";
import { requireManufacturer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";
import type { CreateBatchInput } from "@/lib/types";

export async function POST(req: Request) {
  const authorization = await requireManufacturer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { session } = authorization;

  const parsed = await readJson<CreateBatchInput>(req);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);
  const body = parsed.body;

  const result = await createBatch(createServiceClient(), body, {
    organizationId: session.organizationId!,
    profileId: session.profileId,
  });

  if (!result.ok) {
    return json({ error: result.error }, result.status);
  }

  return json({ batch: result.batch, products: result.products }, 201);
}

export async function GET() {
  const authorization = await requireManufacturer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { session } = authorization;

  const { data: batches, error } = await manufacturerBatchesQuery(
    createServiceClient(),
    session.organizationId!,
  );

  if (error) {
    console.error("[GET /api/batches]", error);
    return json({ error: "Failed to fetch batches" }, 500);
  }

  return json({ batches: batches ?? [] });
}
