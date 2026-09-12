/**
 * One-off fixture for manual two-wallet browser testing of the real
 * Hedera transfer/resale/grievance flows (Seller -> Transfer -> Buyer
 * ownership -> Resale -> Marketplace -> Purchase -> Grievance).
 *
 * Creates ONE new demo batch + product (isolated from any existing seed
 * data or the E2E test fixtures in test-real-transfer-e2e.ts /
 * test-real-resale-e2e.ts — this does not touch those), mints it for real
 * on Hedera testnet, and records real ownership for the seller wallet.
 *
 * Run with: npx tsx scripts/seed-demo-product-for-wallet.ts
 */
import { createClient } from "@supabase/supabase-js";
import { mintConsumerNftOnChain } from "@verichain/hedera";
import { deriveOnChainId } from "../lib/crypto/hash";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

const SELLER_WALLET_ADDRESS = "0x0B6aE344fBF961a1566f846BedF15f33f7420b05".toLowerCase();
const BATCH_CODE = "HARSHEEL-MANUAL-QA-001";
const PRODUCT_CODE = "VC-HARSHEEL-QA-000001";
const SERIAL_NUMBER = "HARSHEEL-QA-SN-000001";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");
  }

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
  if (orgError || !organization) {
    throw new Error(orgError?.message ?? "Failed to upsert organization");
  }

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .upsert(
      {
        batch_code: BATCH_CODE,
        batch_id_hash: deriveOnChainId(BATCH_CODE),
        manufacturer_org_id: organization.id,
        product_name: "VeriChain Manual QA Fixture",
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
  if (batchError || !batch) {
    throw new Error(batchError?.message ?? "Failed to upsert batch");
  }

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
  if (productError || !product) {
    throw new Error(productError?.message ?? "Failed to upsert product");
  }

  console.log(`Product ready in Supabase: ${product.product_code} (${product.id})`);
  console.log(`productIdHash: ${productIdHash}`);

  const { data: existingOwnership } = await supabase
    .from("ownership_records")
    .select("id, owner_wallet_address")
    .eq("product_id", product.id)
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOwnership?.owner_wallet_address === SELLER_WALLET_ADDRESS) {
    console.log("Ownership record already points at the seller wallet — nothing to mint.");
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
  if (ownershipError) {
    throw new Error(`Minted on-chain but failed to record ownership: ${ownershipError.message}`);
  }

  console.log("Fixture ready: seller wallet now owns a real Hedera-minted product.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
