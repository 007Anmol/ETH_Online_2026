import { json } from "@/lib/api/http";
import { manufacturerProductsQuery } from "@/lib/manufacturing";
import { getSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { searchParams } = new URL(req.url);
  const { data: products, error } = await manufacturerProductsQuery(
    createServiceClient(),
    session.organizationId,
    {
      batchId: searchParams.get("batch_id"),
      status: searchParams.get("status"),
    },
  );

  if (error) {
    console.error("[GET /api/products]", error);
    return json({ error: "Failed to fetch products" }, 500);
  }

  return json({ products: products ?? [] });
}
