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
