import { createClient } from "@supabase/supabase-js";
import {
  DEMO_MANUFACTURER_NAME,
  DEMO_MANUFACTURER_WALLET,
} from "../lib/constants";
import { loadEnvFiles } from "./load-env";

async function seed() {
  loadEnvFiles();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local",
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .upsert(
      {
        name: DEMO_MANUFACTURER_NAME,
        type: "MANUFACTURER",
        wallet_address: DEMO_MANUFACTURER_WALLET,
        world_id_verified: true,
      },
      { onConflict: "wallet_address" },
    )
    .select("id")
    .single();

  if (orgError || !organization) {
    throw new Error(orgError?.message ?? "Failed to upsert organization");
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      wallet_address: DEMO_MANUFACTURER_WALLET,
      organization_id: organization.id,
      role: "MANUFACTURER",
      world_id_verified: true,
      display_name: "Demo Manufacturer",
    },
    { onConflict: "wallet_address" },
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const manufacturerPermissions = [
    "CREATE_BATCH",
    "MINT_PRODUCT",
    "REGISTER_TAG",
    "VIEW_PROVENANCE",
  ] as const;

  const { error: permError } = await supabase.from("role_permissions").upsert(
    manufacturerPermissions.map((permission) => ({
      role: "MANUFACTURER" as const,
      permission,
    })),
    { onConflict: "role,permission" },
  );

  if (permError) {
    throw new Error(permError.message);
  }

  console.log("Seeded manufacturer org + profile for", DEMO_MANUFACTURER_WALLET);
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
