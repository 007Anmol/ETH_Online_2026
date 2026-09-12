import "server-only";

import { DEMO_MANUFACTURER_WALLET } from "@/lib/constants";
import { hasSupabaseConfig, createServiceClient } from "@/lib/supabase";
import { setSession, type Session } from "@/lib/session";

export async function loginAsDemoManufacturer(): Promise<Session> {
  if (hasSupabaseConfig()) {
    const supabase = createServiceClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, wallet_address, organization_id, role, display_name")
      .eq("wallet_address", DEMO_MANUFACTURER_WALLET)
      .single();

    if (error || !profile) {
      throw new Error(
        "Demo manufacturer profile not found. Run `npm run seed` or supabase/seed.sql.",
      );
    }

    const session: Session = {
      walletAddress: profile.wallet_address,
      role: profile.role,
      profileId: profile.id,
      organizationId: profile.organization_id,
      displayName: profile.display_name,
    };
    await setSession(session);
    return session;
  }

  const session: Session = {
    walletAddress: DEMO_MANUFACTURER_WALLET,
    role: "MANUFACTURER",
    profileId: "local-demo-profile",
    organizationId: "local-demo-org",
    displayName: "Demo Manufacturer",
  };
  await setSession(session);
  return session;
}

/**
 * Test-harness-only consumer login (ALLOW_TEST_AUTH gated, same as
 * loginAsDemoManufacturer). Looks up an existing CONSUMER profile by wallet
 * address rather than requiring the full Privy + wallet-signature flow —
 * lets automated tests exercise requireConsumer()-gated routes without a
 * real browser wallet. See frontend/CONSUMER_BACKEND_PLAN.md.
 */
export async function loginAsDemoConsumer(walletAddress: string): Promise<Session> {
  const normalized = walletAddress.trim().toLowerCase();

  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured — demo consumer login requires it.");
  }

  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, wallet_address, organization_id, role, display_name")
    .eq("wallet_address", normalized)
    .maybeSingle();

  if (error) throw error;

  let resolvedProfile = profile;
  if (!resolvedProfile) {
    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert({
        wallet_address: normalized,
        organization_id: null,
        role: "CONSUMER",
        world_id_verified: false,
        display_name: `${normalized.slice(0, 6)}…${normalized.slice(-4)}`,
      })
      .select("id, wallet_address, organization_id, role, display_name")
      .single();
    if (insertError || !created) {
      throw insertError ?? new Error("Could not create demo consumer profile");
    }
    resolvedProfile = created;
  } else if (resolvedProfile.role !== "CONSUMER") {
    throw new Error(`${normalized} is already registered with role ${resolvedProfile.role}`);
  }

  const session: Session = {
    walletAddress: resolvedProfile.wallet_address,
    role: resolvedProfile.role,
    profileId: resolvedProfile.id,
    organizationId: resolvedProfile.organization_id,
    displayName: resolvedProfile.display_name,
  };
  await setSession(session);
  return session;
}
