import {
  DEMO_BATCH_CODE,
  DEMO_MANUFACTURER_WALLET,
  DEMO_PLANT_ID,
  DEMO_PRODUCT_CATEGORY,
  DEMO_PRODUCT_CODE,
  DEMO_PRODUCT_NAME,
  DEMO_SERIAL_NUMBER,
} from "../lib/constants";
import { placeholderHash } from "../lib/crypto/hash";
import { PRODUCT_CATEGORIES, isProductCategory } from "../lib/types";
import { createReporter, deleteHarnessBatches, serviceClient } from "./test-helpers";

const { check, finish } = createReporter("Schema / seed consistency");

async function main() {
  const supabase = serviceClient();
  await deleteHarnessBatches(supabase);

  const { data: seedBatch, error: seedBatchError } = await supabase
    .from("batches")
    .select("*")
    .eq("batch_code", DEMO_BATCH_CODE)
    .maybeSingle();

  check("seed batch exists", Boolean(seedBatch), seedBatchError?.message);
  if (seedBatch) {
    check(
      "seed batch category is WATCHES",
      seedBatch.product_category === DEMO_PRODUCT_CATEGORY,
      seedBatch.product_category,
    );
    check(
      "seed batch product name matches constants",
      seedBatch.product_name === DEMO_PRODUCT_NAME,
      seedBatch.product_name,
    );
    check(
      "seed batch plant matches constants",
      seedBatch.plant_id === DEMO_PLANT_ID,
      seedBatch.plant_id,
    );
    check(
      "seed batch hash matches placeholderHash",
      seedBatch.batch_id_hash === placeholderHash(DEMO_BATCH_CODE),
      seedBatch.batch_id_hash,
    );
    check(
      "seed batch status is MINTED",
      seedBatch.status === "MINTED",
      seedBatch.status,
    );
    check(
      "seed batch has no expiry_date column",
      !("expiry_date" in seedBatch),
      Object.keys(seedBatch).join(","),
    );
    check(
      "seed category is a known enum value",
      isProductCategory(seedBatch.product_category),
    );
  }

  const { data: expiryProbe, error: expiryError } = await (
    supabase.from("batches") as any
  )
    .select("expiry_date")
    .limit(1);
  check(
    "selecting expiry_date fails because the column was dropped",
    Boolean(expiryError) && !expiryProbe,
    expiryError?.message ?? "column still exists — run 0008_batch_category_drop_expiry.sql",
  );

  const { data: seedProduct, error: seedProductError } = await supabase
    .from("products")
    .select("product_code, serial_number, status, batch_id, product_id_hash")
    .eq("product_code", DEMO_PRODUCT_CODE)
    .maybeSingle();

  check("seed product exists", Boolean(seedProduct), seedProductError?.message);
  if (seedProduct && seedBatch) {
    check(
      "seed product belongs to seed batch",
      seedProduct.batch_id === seedBatch.id,
    );
    check(
      "seed serial matches constants",
      seedProduct.serial_number === DEMO_SERIAL_NUMBER,
      seedProduct.serial_number,
    );
    check(
      "seed product hash matches placeholderHash",
      seedProduct.product_id_hash === placeholderHash(DEMO_PRODUCT_CODE),
    );
    check(
      "seed product is TAG_PENDING or TAG_BOUND",
      seedProduct.status === "TAG_PENDING" || seedProduct.status === "TAG_BOUND",
      seedProduct.status,
    );
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("wallet_address", DEMO_MANUFACTURER_WALLET)
    .single();
  if (!org) throw new Error("Demo organization missing. Run npm run seed.");

  const badCode = "HARNESS-BAD-CAT";
  const { error: invalidCategoryError } = await supabase.from("batches").insert({
    batch_code: badCode,
    batch_id_hash: placeholderHash(badCode),
    manufacturer_org_id: org.id,
    product_name: "Should Fail",
    plant_id: "TEST-01",
    quantity: 1,
    minted_count: 1,
    status: "MINTED",
    // @ts-expect-error free-text must be rejected by the Postgres enum
    product_category: "Luxury watch",
  });
  check(
    "Postgres rejects free-text product_category",
    Boolean(invalidCategoryError),
    invalidCategoryError?.message ?? "accepted — run 0008_batch_category_drop_expiry.sql",
  );

  const { error: missingCategoryError } = await supabase.from("batches").insert({
    batch_code: `${badCode}-NULL`,
    batch_id_hash: placeholderHash(`${badCode}-NULL`),
    manufacturer_org_id: org.id,
    product_name: "Should Fail",
    plant_id: "TEST-01",
    quantity: 1,
    minted_count: 1,
    status: "MINTED",
  } as never);
  check(
    "Postgres rejects a missing product_category",
    Boolean(missingCategoryError),
    missingCategoryError?.message ?? "NULL still allowed — run 0008",
  );

  for (const category of PRODUCT_CATEGORIES) {
    const code = `HARNESS-ENUM-${category}`;
    await supabase.from("batches").delete().eq("batch_code", code);
    const { data: row, error } = await supabase
      .from("batches")
      .insert({
        batch_code: code,
        batch_id_hash: placeholderHash(code),
        manufacturer_org_id: org.id,
        product_name: `Enum ${category}`,
        product_category: category,
        plant_id: "TEST-01",
        quantity: 1,
        minted_count: 1,
        status: "MINTED",
      })
      .select("product_category")
      .single();
    check(
      `Postgres accepts ${category}`,
      !error && row?.product_category === category,
      error?.message,
    );
    await supabase.from("batches").delete().eq("batch_code", code);
  }

  await deleteHarnessBatches(supabase);
  finish();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
