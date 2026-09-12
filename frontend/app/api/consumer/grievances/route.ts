import { json, readJson } from "@/lib/api/http";
import { requireConsumer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";
import type { Database } from "@/lib/types";

type CreateGrievanceBody = {
  productId?: string;
  category?: Database["public"]["Enums"]["grievance_category"];
  description?: string;
  evidenceRef?: string | null;
};

const VALID_CATEGORIES = new Set([
  "COUNTERFEIT_SUSPICION",
  "DAMAGED_PRODUCT",
  "MISSING_HISTORY",
  "OWNERSHIP_DISPUTE",
  "OTHER",
]);

function generateGrievanceNumber(): string {
  const random = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `GRV-${random}`;
}

/**
 * A consumer can only ever create a grievance in status OPEN — status
 * transitions are a separate authorized action, never settable by the
 * submitter. Filing a grievance never flags a product itself; see
 * CONSUMER_BACKEND_PLAN.md's "grievance does not automatically mean
 * counterfeit" rule.
 */
export async function POST(request: Request) {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { session } = authorization;

  const parsed = await readJson<CreateGrievanceBody>(request);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);
  const { productId, category, description, evidenceRef } = parsed.body;

  if (!productId || !category || !description) {
    return json({ error: "productId, category, and description are required" }, 400);
  }
  if (!VALID_CATEGORIES.has(category)) {
    return json({ error: "Invalid category" }, 400);
  }
  if (description.trim().length < 10) {
    return json({ error: "description must be at least 10 characters" }, 400);
  }

  const supabase = createServiceClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (productError) return json({ error: "Could not load product" }, 500);
  if (!product) return json({ error: "Product not found" }, 404);

  const grievanceNumber = generateGrievanceNumber();
  const { data: grievance, error: insertError } = await supabase
    .from("grievances")
    .insert({
      grievance_number: grievanceNumber,
      consumer_profile_id: session.profileId,
      product_id: productId,
      category,
      description: description.trim(),
      evidence_ref: evidenceRef ?? null,
      status: "OPEN",
    })
    .select("id, grievance_number, status, created_at")
    .single();

  if (insertError || !grievance) {
    console.error("[consumer/grievances] create failed", insertError);
    return json({ error: "Could not submit grievance" }, 500);
  }

  await supabase.from("grievance_events").insert({
    grievance_id: grievance.id,
    status: "OPEN",
    note: "Grievance submitted.",
    created_by: session.profileId,
  });

  console.log(
    JSON.stringify({
      event: "grievance.submitted",
      source: "backend",
      grievanceId: grievance.id,
      grievanceNumber: grievance.grievance_number,
      productId,
      category,
      timestamp: new Date().toISOString(),
    }),
  );

  return json({ grievance }, 201);
}

/** Lists ONLY the authenticated consumer's own grievances. */
export async function GET() {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { session } = authorization;

  const supabase = createServiceClient();
  const { data: grievances, error } = await supabase
    .from("grievances")
    .select("id, grievance_number, product_id, category, status, created_at, resolved_at")
    .eq("consumer_profile_id", session.profileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[consumer/grievances] list failed", error);
    return json({ error: "Could not load grievances" }, 500);
  }

  return json({ grievances: grievances ?? [] });
}
