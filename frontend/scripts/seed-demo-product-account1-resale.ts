/**
 * Fresh fixture for the marketplace/resale demo — Account 1 as seller.
 * Isolated batch/product code from every other fixture used so far.
 *
 * Run with: npx tsx scripts/seed-demo-product-account1-resale.ts
 */
import { createClient } from "@supabase/supabase-js";
import { mintConsumerNftOnChain } from "@verichain/hedera";
import { deriveOnChainId } from "../lib/crypto/hash";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

const SELLER_WALLET_ADDRESS = "0xE91Bf37E41681282dD25786f3E8FEe80Afd7a768".toLowerCase();
const BATCH_CODE = "MANUAL-QA-RESALE-001";
const PRODUCT_CODE = "VC-QA-RESALE-000001";
const SERIAL_NUMBER = "QA-RESALE-SN-000001";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .upsert(
      {
        name: "VeriChain Demo Manufacturer",
        type: "MANUFACTURER",
        wallet_address: "0x0000000000000000000000000000000000000001",
        world_id_verified: true,
      },
      { onConflict: "wallet_address" },
    )
    .select("id")
    .single();
  if (orgError || !organization) throw new Error(orgError?.message ?? "Failed to upsert organization");

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .upsert(
      {
        batch_code: BATCH_CODE,
        batch_id_hash: deriveOnChainId(BATCH_CODE),
        manufacturer_org_id: organization.id,
        product_name: "VeriChain Manual QA Fixture (Resale demo)",
        product_category: "WATCHES",
        plant_id: "QA-PLANT-01",
        manufacturing_date: new Date().toISOString().slice(0, 10),
        quantity: 1,
        minted_count: 1,
        status: "MINTED",
      },
      { onConflict: "batch_code" },
    )
    .select("id")
    .single();
  if (batchError || !batch) throw new Error(batchError?.message ?? "Failed to upsert batch");

  const productIdHash = deriveOnChainId(PRODUCT_CODE);

  const { data: product, error: productError } = await supabase
    .from("products")
    .upsert(
      {
        product_code: PRODUCT_CODE,
        product_id_hash: productIdHash,
        batch_id: batch.id,
        serial_number: SERIAL_NUMBER,
        manufacturer_org_id: organization.id,
        status: "OWNED",
      },
      { onConflict: "product_code" },
    )
    .select("id, product_code")
    .single();
  if (productError || !product) throw new Error(productError?.message ?? "Failed to upsert product");

  console.log(`Product ready in Supabase: ${product.product_code} (${product.id})`);
  console.log(`productIdHash: ${productIdHash}`);

  const { data: existingOwnership } = await supabase
    .from("ownership_records")
    .select("owner_wallet_address")
    .eq("product_id", product.id)
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOwnership?.owner_wallet_address === SELLER_WALLET_ADDRESS) {
    console.log("Already owned by Account 1 — nothing to mint.");
    return;
  }

  console.log(`Minting on Hedera testnet to ${SELLER_WALLET_ADDRESS}...`);
  const { txHash } = await mintConsumerNftOnChain({
    productIdHash,
    initialOwner: SELLER_WALLET_ADDRESS as `0x${string}`,
  });
  console.log(`Mint tx: https://hashscan.io/testnet/transaction/${txHash}`);

  const { error: ownershipError } = await supabase.from("ownership_records").insert({
    product_id: product.id,
    owner_wallet_address: SELLER_WALLET_ADDRESS,
    chain_tx_hash: txHash,
  });
  if (ownershipError) throw new Error(`Minted but failed to record ownership: ${ownershipError.message}`);

  console.log("Fixture ready: Account 1 owns a real Hedera-minted product for resale demo.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
