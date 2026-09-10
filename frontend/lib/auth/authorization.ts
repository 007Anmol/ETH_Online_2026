import "server-only";

import { evaluateManufacturerAccess } from "@/lib/auth/complete-login";
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

  const access = evaluateManufacturerAccess(profile);
  if (!access.ok) {
    return access;
  }

  return { ok: true, session, profile };
}