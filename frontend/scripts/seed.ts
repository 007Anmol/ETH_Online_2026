import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEMO_BATCH_CODE,
  DEMO_MANUFACTURER_NAME,
  DEMO_MANUFACTURER_WALLET,
  DEMO_PLANT_ID,
  DEMO_PRODUCT_CATEGORY,
  DEMO_PRODUCT_CODE,
  DEMO_PRODUCT_NAME,
  DEMO_SERIAL_NUMBER,
} from "../lib/constants";
import { placeholderHash } from "../lib/crypto/hash";
import { loadEnvFiles } from "./load-env";

async function requireOk(
  error: { message: string } | null,
  fallback: string,
) {
  if (error) throw new Error(error.message || fallback);
}

async function clearBindState(
  supabase: SupabaseClient,
  productId: string,
) {
  const { data: tags, error: tagsError } = await supabase
    .from("nfc_tags")
    .select("id")
    .eq("product_id", productId);
  await requireOk(tagsError, "Could not list tags");

  const tagIds = (tags ?? []).map((tag) => tag.id);

  if (tagIds.length > 0) {
    await requireOk(
      (await supabase.from("verification_attempts").delete().in("tag_id", tagIds))
        .error,
      "Could not clear verification attempts",
    );
    await requireOk(
      (await supabase.from("verification_nonces").delete().in("tag_id", tagIds))
        .error,
      "Could not clear nonces",
    );
    await requireOk(
      (await supabase.from("tag_binding_history").delete().in("tag_id", tagIds))
        .error,
      "Could not clear bind history",
    );
    await requireOk(
      (await supabase.from("product_events").delete().in("tag_id", tagIds)).error,
      "Could not clear tag events",
    );
    await requireOk(
      (await supabase.from("nfc_tags").delete().in("id", tagIds)).error,
      "Could not clear tags",
    );
  }

  await requireOk(
    (await supabase.from("tag_binding_history").delete().eq("product_id", productId))
      .error,
    "Could not clear leftover bind history",
  );
  await requireOk(
    (await supabase.from("product_events").delete().eq("product_id", productId))
      .error,
    "Could not clear leftover product events",
  );
}

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
  await requireOk(profileError, "Failed to upsert profile");

  const { error: permError } = await supabase.from("role_permissions").upsert(
    (
      [
        "CREATE_BATCH",
        "MINT_PRODUCT",
        "REGISTER_TAG",
        "VIEW_PROVENANCE",
      ] as const
    ).map((permission) => ({
      role: "MANUFACTURER" as const,
      permission,
    })),
    { onConflict: "role,permission" },
  );
  await requireOk(permError, "Failed to upsert permissions");

  const leftoverCode = "SAACHI-SEED-001";
  const { data: leftover } = await supabase
    .from("batches")
    .select("id")
    .eq("batch_code", leftoverCode)
    .maybeSingle();
  if (leftover) {
    await requireOk(
      (await supabase.from("products").delete().eq("batch_id", leftover.id)).error,
      "Could not remove leftover seed products",
    );
    await requireOk(
      (await supabase.from("batches").delete().eq("id", leftover.id)).error,
      "Could not remove leftover seed batch",
    );
  }

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .upsert(
      {
        batch_code: DEMO_BATCH_CODE,
        batch_id_hash: placeholderHash(DEMO_BATCH_CODE),
        manufacturer_org_id: organization.id,
        product_name: DEMO_PRODUCT_NAME,
        product_category: DEMO_PRODUCT_CATEGORY,
        plant_id: DEMO_PLANT_ID,
        manufacturing_date: "2026-09-06",
        quantity: 1,
        minted_count: 1,
        status: "MINTED",
      },
      { onConflict: "batch_code" },
    )
    .select("id")
    .single();

  if (batchError || !batch) {
    throw new Error(batchError?.message ?? "Failed to upsert seed batch");
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .upsert(
      {
        product_code: DEMO_PRODUCT_CODE,
        product_id_hash: placeholderHash(DEMO_PRODUCT_CODE),
        batch_id: batch.id,
        serial_number: DEMO_SERIAL_NUMBER,
        manufacturer_org_id: organization.id,
        status: "TAG_PENDING",
      },
      { onConflict: "product_code" },
    )
    .select("id, product_code, status")
    .single();

  if (productError || !product) {
    throw new Error(productError?.message ?? "Failed to upsert seed product");
  }

  await clearBindState(supabase, product.id);

  const { error: resetError } = await supabase
    .from("products")
    .update({ status: "TAG_PENDING" })
    .eq("id", product.id);
  await requireOk(resetError, "Failed to reset product status");

  console.log("Step 1 seed is clean:");
  console.log(`  batch   ${DEMO_BATCH_CODE}  MINTED`);
  console.log(`  product ${product.product_code}  TAG_PENDING`);
  console.log("  tags    none");
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
