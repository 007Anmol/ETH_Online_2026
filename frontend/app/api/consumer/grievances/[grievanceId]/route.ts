import { json } from "@/lib/api/http";
import { requireConsumer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";

/**
 * A consumer can only ever read their OWN grievance. Returns 404 (not 403)
 * for another consumer's grievance so existence isn't leaked either way —
 * see CONSUMER_BACKEND_PLAN.md's isolation requirement.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ grievanceId: string }> },
) {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { session } = authorization;
  const { grievanceId } = await params;

  const supabase = createServiceClient();
  const { data: grievance, error } = await supabase
    .from("grievances")
    .select("*")
    .eq("id", grievanceId)
    .eq("consumer_profile_id", session.profileId)
    .maybeSingle();

  if (error) {
    console.error("[consumer/grievances/:id] load failed", error);
    return json({ error: "Could not load grievance" }, 500);
  }
  if (!grievance) return json({ error: "Grievance not found" }, 404);

  const { data: events } = await supabase
    .from("grievance_events")
    .select("id, status, note, created_at")
    .eq("grievance_id", grievanceId)
    .order("created_at", { ascending: true });

  console.log(
    JSON.stringify({
      event: "grievance.retrieved",
      source: "backend",
      grievanceId,
      timestamp: new Date().toISOString(),
    }),
  );

  return json({ grievance: { ...grievance, events: events ?? [] } });
}
