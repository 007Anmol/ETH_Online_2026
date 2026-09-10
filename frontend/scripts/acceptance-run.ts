import { createClient } from "@supabase/supabase-js";
import { createBatch } from "../lib/manufacturing/create-batch";
import { bindTag } from "../lib/nfc/bind-tag";
import { simulateTap } from "../lib/nfc/simulate-tap";
import { verifyTap } from "../lib/nfc/verify-tap";
import { revokeTag } from "../lib/nfc/revoke-tag";
import type { Database } from "../lib/database.types";
import { loadEnvFiles } from "./load-env";

async function main() {
  loadEnvFiles();
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log("Starting Phase 2 Acceptance Run...");

  // Get demo organization
  const { data: org } = await supabase.from("organizations").select("id").limit(1).single();
  if (!org) throw new Error("No organization found");

  // 1. Create a brand new batch of 3 products
  const batchCode = `ACC-${Date.now()}`;
  console.log(`\n1. Creating batch: ${batchCode}`);
  const batchRes = await createBatch(supabase, {
    product_name: "Phase 2 Product",
    batch_code: batchCode,
    plant_id: "TEST-01",
    quantity: 3,
    product_category: "WATCHES",
  }, {
    organizationId: org.id,
    profileId: null,
  });

  if (!batchRes.ok) throw new Error(`Batch creation failed: ${batchRes.error}`);
  console.log(`   Created batch ${batchRes.batch.batch_code} and 3 products`);
  console.log(`   TxHash: https://hashscan.io/testnet/transaction/${batchRes.batch.chain_tx_hash?.replace('@', '-')}`);
  
  const product = batchRes.products[0];

  // 2. Bind an NFC tag to one of them
  const tagUid = `04${Date.now().toString().slice(-8)}AA`;
  console.log(`\n2. Binding NFC Tag ${tagUid} to product ${product.product_code}`);
  const bindRes = await bindTag(supabase, {
    product_id: product.id,
    tag_uid: tagUid,
    manufacturerOrgId: org.id,
  });

  if (!bindRes.ok) throw new Error(`Bind failed: ${bindRes.error}`);
  console.log(`   Bound successfully!`);

  // We need to fetch the tag to get chain_tx_hash
  const { data: tagAfterBind } = await supabase.from("nfc_tags").select("id, chain_tx_hash").eq("id", bindRes.tag_id).single();
  console.log(`   TxHash: https://hashscan.io/testnet/transaction/${tagAfterBind?.chain_tx_hash?.replace('@', '-')}`);

  // 3. Simulate an authentic tap (AUTHENTIC)
  console.log("\n3. Simulating AUTHENTIC tap...");
  const simulated = await simulateTap(supabase, { tag_uid: tagUid });
  if (!simulated.ok) throw new Error(`Simulate failed: ${simulated.error}`);
  
  const tap1 = await verifyTap(supabase, simulated.payload);
  console.log(`   Result: ${tap1.result}`);
  if (tap1.result !== "AUTHENTIC") throw new Error("Expected AUTHENTIC");
  console.log(`   TxHash: https://hashscan.io/testnet/transaction/${tap1.chain_tx_hash?.replace('@', '-')}`);

  // 4. Replay the identical tap (DUPLICATE)
  console.log("\n4. Simulating DUPLICATE tap (replay)...");
  const tap2 = await verifyTap(supabase, simulated.payload);
  console.log(`   Result: ${tap2.result} (Reason: ${tap2.failure_reason})`);
  if (tap2.result !== "DUPLICATE") throw new Error("Expected DUPLICATE");

  // 5. Delete the nonce from local Supabase database and replay tap again
  console.log("\n5. The Ultimate Proof: Deleting local nonce and replaying tap...");
  const { data: allNonces } = await supabase.from("verification_nonces").select("*").eq("tag_id", bindRes.tag_id);
  for (const n of allNonces || []) {
     await supabase.from("verification_nonces").delete().eq("id", n.id);
  }
  
  const tap3 = await verifyTap(supabase, simulated.payload);
  console.log(`   Result: ${tap3.result} (Reason: ${tap3.failure_reason})`);
  if (tap3.result !== "DUPLICATE") throw new Error("Expected DUPLICATE due to Hedera revert!");
  
  // 6. Revoke the tag
  console.log(`\n6. Revoking tag ${tagUid}...`);
  const revokeRes = await revokeTag(supabase, {
    tag_id: bindRes.tag_id,
    reason: "Stolen",
    manufacturerOrgId: org.id,
  });
  if (!revokeRes.ok) throw new Error(`Revoke failed: ${revokeRes.error}`);
  console.log(`   Revoked successfully!`);
  const { data: tagAfterRevoke } = await supabase.from("nfc_tags").select("id, chain_tx_hash").eq("id", bindRes.tag_id).single();
  console.log(`   TxHash: https://hashscan.io/testnet/transaction/${tagAfterRevoke?.chain_tx_hash?.replace('@', '-')}`);

  console.log("\nAcceptance Run Complete!");
}

main().catch(err => {
  console.error("Run failed:", err);
  process.exit(1);
});
