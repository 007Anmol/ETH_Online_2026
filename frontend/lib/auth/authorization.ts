import "server-only";

import { getSession, type Session } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type ManufacturerAuthorization =
  | { ok: true; session: Session; profile: Profile }
  | { ok: false; status: 401 | 403; error: string };

export async function requireManufacturer(): Promise<ManufacturerAuthorization> {
  const session = await getSession();

  if (!session || !session.profileId || !session.organizationId) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const { data: profile, error } = await createServiceClient()
    .from("profiles")
    .select("*")
    .eq("id", session.profileId)
    .eq("wallet_address", session.walletAddress.toLowerCase())
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (error || !profile) {
    return { ok: false, status: 401, error: "Authenticated profile is invalid" };
  }

  if (profile.role !== "MANUFACTURER" || !profile.world_id_verified) {
    return {
      ok: false,
      status: 403,
      error: "Verified manufacturer authorization required",
    };
  }

  return { ok: true, session, profile };
}

export type ConsumerAuthorization =
  | { ok: true; session: Session; profile: Profile }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Same shape as requireManufacturer() — read the session, re-verify the
 * profile row server-side via the service-role client, never trust the
 * client-sent identity. Consumer profiles have no organization_id and don't
 * require World ID verification (that's a manufacturer-only trust gate).
 */
export async function requireConsumer(): Promise<ConsumerAuthorization> {
  const session = await getSession();

  if (!session || !session.profileId) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const { data: profile, error } = await createServiceClient()
    .from("profiles")
    .select("*")
    .eq("id", session.profileId)
    .eq("wallet_address", session.walletAddress.toLowerCase())
    .maybeSingle();

  if (error || !profile) {
    return { ok: false, status: 401, error: "Authenticated profile is invalid" };
  }

  if (profile.role !== "CONSUMER") {
    return { ok: false, status: 403, error: "Consumer authorization required" };
  }

  return { ok: true, session, profile };
}