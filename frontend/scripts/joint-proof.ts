import "./load-env";
import { bindTag } from "../lib/nfc/bind-tag";
import { createBatch } from "../lib/manufacturing/create-batch";
import { revokeTag } from "../lib/nfc/revoke-tag";
import { simulateTap } from "../lib/nfc/simulate-tap";
import { verifyTap } from "../lib/nfc/verify-tap";
import { serviceClient } from "./test-helpers";

function tagUid(suffix: string) {
  return `04${Date.now().toString(16).slice(-8)}${suffix}`.slice(0, 20);
}

async function main() {
  const supabase = serviceClient();
  const { data: org } = await supabase.from("organizations").select("id").limit(1).single();
  if (!org) throw new Error("No organization found");

  console.log("Phase 3 joint proof — fresh batch, one product identity\n");

  const batchCode = `JOINT-${Date.now()}`;
  console.log(`1. Create batch of 3: ${batchCode}`);
  const batchRes = await createBatch(
    supabase,
    {
      product_name: "Phase 3 Joint Proof",
      batch_code: batchCode,
      plant_id: "JOINT-01",
      quantity: 3,
      product_category: "WATCHES",
    },
    { organizationId: org.id, profileId: null },
  );
  if (!batchRes.ok) throw new Error(`Create batch failed: ${batchRes.error}`);
  if (batchRes.products.length !== 3) {
    throw new Error(`Expected 3 products, got ${batchRes.products.length}`);
  }
  console.log(`   mint tx ${batchRes.batch.chain_tx_hash}`);

  const product = batchRes.products[0]!;
  const tagA = tagUid("AA");
  console.log(`\n2. Bind tag A ${tagA} → ${product.product_code}`);
  const bindA = await bindTag(supabase, {
    product_id: product.id,
    tag_uid: tagA,
    manufacturerOrgId: org.id,
  });
  if (!bindA.ok) throw new Error(`Bind A failed: ${bindA.error}`);
  console.log(`   bind tx on tag ${bindA.tag_id}`);

  console.log("\n3. Authentic tap");
  const simulated = await simulateTap(supabase, { tag_uid: tagA });
  if (!simulated.ok) throw new Error(`Simulate failed: ${simulated.error}`);
  const authentic = await verifyTap(supabase, simulated.payload);
  if (authentic.result !== "AUTHENTIC" || !authentic.chain_tx_hash) {
    throw new Error(`Expected AUTHENTIC with consume hash, got ${JSON.stringify(authentic)}`);
  }
  const { data: nonceRow } = await supabase
    .from("verification_nonces")
    .select("consumed, chain_tx_hash")
    .eq("tag_id", bindA.tag_id)
    .eq("consumed", true)
    .order("consumed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!nonceRow?.chain_tx_hash || nonceRow.chain_tx_hash !== authentic.chain_tx_hash) {
    throw new Error("Consume tx hash was not saved on verification_nonces");
  }
  console.log(`   AUTHENTIC consume ${authentic.chain_tx_hash}`);

  console.log("\n4. Replay same payload");
  const duplicate = await verifyTap(supabase, simulated.payload);
  if (duplicate.result !== "DUPLICATE") {
    throw new Error(`Expected DUPLICATE, got ${duplicate.result} ${duplicate.failure_reason}`);
  }
  console.log(`   DUPLICATE (${duplicate.failure_reason})`);

  console.log("\n5. Wipe local nonce row and replay again (Hedera is authority)");
  await supabase.from("verification_nonces").delete().eq("tag_id", bindA.tag_id);
  const stillDuplicate = await verifyTap(supabase, simulated.payload);
  if (stillDuplicate.result !== "DUPLICATE") {
    throw new Error(
      `Expected DUPLICATE after DB wipe, got ${stillDuplicate.result} ${stillDuplicate.failure_reason}`,
    );
  }
  console.log("   still DUPLICATE from the contract");

  console.log("\n6. Revoke tag A");
  const revoked = await revokeTag(supabase, {
    tag_id: bindA.tag_id,
    reason: "Replacement tag for joint proof",
    manufacturerOrgId: org.id,
  });
  if (!revoked.ok) throw new Error(`Revoke failed: ${revoked.error}`);
  const { data: tagARow } = await supabase
    .from("nfc_tags")
    .select("id, status, tag_uid")
    .eq("id", bindA.tag_id)
    .single();
  if (!tagARow || tagARow.status !== "REVOKED") {
    throw new Error("Tag A row was deleted or not marked REVOKED");
  }
  console.log(`   tag A ${tagARow.tag_uid} still exists as REVOKED`);

  const tagB = tagUid("BB");
  console.log(`\n7. Bind tag B ${tagB} to the same product`);
  const bindB = await bindTag(supabase, {
    product_id: product.id,
    tag_uid: tagB,
    manufacturerOrgId: org.id,
  });
  if (!bindB.ok) throw new Error(`Bind B failed: ${bindB.error}`);

  const { data: history } = await supabase
    .from("tag_binding_history")
    .select("tag_id, action")
    .eq("product_id", product.id)
    .order("created_at", { ascending: true });

  const actions = (history ?? []).map((row) => `${row.tag_id}:${row.action}`);
  const expected = [
    `${bindA.tag_id}:BOUND`,
    `${bindA.tag_id}:REVOKED`,
    `${bindB.tag_id}:BOUND`,
  ];
  if (actions.join("|") !== expected.join("|")) {
    throw new Error(`History mismatch: ${actions.join(" → ")}`);
  }

  const { data: tagAAfterB } = await supabase
    .from("nfc_tags")
    .select("id, status")
    .eq("id", bindA.tag_id)
    .single();
  if (!tagAAfterB || tagAAfterB.status !== "REVOKED") {
    throw new Error("Binding tag B erased or changed tag A history");
  }

  console.log("   history: Tag A BOUND → Tag A REVOKED → Tag B BOUND");
  console.log("\nJoint proof passed.");
  console.log(`Product ${product.product_code}  batch ${batchCode}`);
}

main().catch((error) => {
  console.error("Joint proof failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
