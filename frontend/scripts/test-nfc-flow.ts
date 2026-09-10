import { createClient } from "@supabase/supabase-js";
import {
  DEMO_PRODUCT_CATEGORY,
  DEMO_PRODUCT_CODE,
  DEMO_TAG_UID,
  SHARED_DEMO_BATCH_CODE,
} from "../lib/constants";
import type { Database } from "../lib/database.types";
import { bindTag } from "../lib/nfc/bind-tag";
import { simulateTap } from "../lib/nfc/simulate-tap";
import { UNKNOWN_TAP_PAYLOAD } from "../lib/nfc/unknown-tap";
import { verifyTap } from "../lib/nfc/verify-tap";
import { loadEnvFiles } from "./load-env";

function line(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

async function main() {
  loadEnvFiles();
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let failed = 0;
  const check = (name: string, ok: boolean, detail?: string) => {
    if (!line(name, ok, detail)) failed += 1;
  };

  const { data: product } = await supabase
    .from("products")
    .select("id, product_code, status, manufacturer_org_id")
    .eq("product_code", DEMO_PRODUCT_CODE)
    .single();

  check("dummy product exists", Boolean(product), product?.status);

  const { data: tag } = await supabase
    .from("nfc_tags")
    .select("tag_uid, status, product_id")
    .eq("tag_uid", DEMO_TAG_UID)
    .maybeSingle();

  check(
    "dummy tag is BOUND to dummy product",
    tag?.status === "BOUND" && tag.product_id === product?.id,
    tag ? `${tag.status} ${tag.tag_uid}` : "missing tag",
  );

  if (product && tag?.status === "BOUND") {
    check(
      "product status is TAG_BOUND",
      product.status === "TAG_BOUND",
      product.status,
    );

    const again = await bindTag(supabase, {
      product_id: product.id,
      tag_uid: "04BBBBBBBB99",
      manufacturerOrgId: product.manufacturer_org_id,
    });
    check(
      "second bind is rejected",
      !again.ok && again.status === 409,
      again.ok ? "bound again" : again.error,
    );

    const simulated = await simulateTap(supabase, { tag_uid: DEMO_TAG_UID });
    check("simulate returns a payload", simulated.ok);
    if (simulated.ok) {
      check(
        "simulate payload tag matches dummy",
        simulated.payload.tag_uid === DEMO_TAG_UID,
      );
      const authentic = await verifyTap(supabase, simulated.payload);
      check(
        "simulate → verify is AUTHENTIC",
        authentic.result === "AUTHENTIC" &&
          authentic.product_code === DEMO_PRODUCT_CODE &&
          authentic.product_category === DEMO_PRODUCT_CATEGORY,
        authentic.result,
      );
      const duplicate = await verifyTap(supabase, simulated.payload);
      check("replay is DUPLICATE", duplicate.result === "DUPLICATE");
    }

    const invalid = await verifyTap(supabase, UNKNOWN_TAP_PAYLOAD);
    check("broken stamp is INVALID", invalid.result === "INVALID");

    const { data: latest } = await supabase
      .from("verification_attempts")
      .select("result")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    check(
      "unknown invalid tap does not become the product last result",
      latest?.result === "DUPLICATE",
      latest?.result,
    );
  }

  const { data: sharedBatch } = await supabase
    .from("batches")
    .select("id, batch_code, quantity")
    .eq("batch_code", SHARED_DEMO_BATCH_CODE)
    .maybeSingle();
  check(
    "shared 3-unit batch exists",
    sharedBatch?.quantity === 3,
    sharedBatch ? `qty=${sharedBatch.quantity}` : "missing",
  );

  const { data: sharedProducts } = sharedBatch
    ? await supabase
        .from("products")
        .select("id, product_code, status, manufacturer_org_id")
        .eq("batch_id", sharedBatch.id)
        .order("product_code")
    : { data: [] };

  check(
    "shared batch has 3 products",
    (sharedProducts?.length ?? 0) === 3,
    `count=${sharedProducts?.length ?? 0}`,
  );

  const { data: sharedTags } = await supabase
    .from("nfc_tags")
    .select("tag_uid, product_id, status")
    .eq("status", "BOUND");
  const sharedBound = (sharedProducts ?? []).filter((product) =>
    (sharedTags ?? []).some(
      (tag) => tag.product_id === product.id && tag.status === "BOUND",
    ),
  );
  const sharedUnbound = (sharedProducts ?? []).filter(
    (product) => product.status === "TAG_PENDING",
  );

  check(
    "exactly one shared product is already bound for the demo",
    sharedBound.length === 1,
    `bound=${sharedBound.map((p) => p.product_code).join(",")}`,
  );
  check(
    "remaining shared units stay unbound",
    sharedUnbound.length === 2,
    `unbound=${sharedUnbound.length}`,
  );

  const sharedTag = (sharedTags ?? []).find(
    (tag) => tag.product_id === sharedBound[0]?.id,
  );
  if (sharedTag) {
    const simulated = await simulateTap(supabase, {
      tag_uid: sharedTag.tag_uid,
    });
    check("shared simulate returns a payload", simulated.ok);
    if (simulated.ok) {
      const authentic = await verifyTap(supabase, simulated.payload);
      check(
        "shared bind → authentic",
        authentic.result === "AUTHENTIC" &&
          authentic.batch_code === SHARED_DEMO_BATCH_CODE &&
          authentic.product_code === sharedBound[0]?.product_code,
        `${authentic.result} ${authentic.product_code} ${authentic.batch_code}`,
      );
      const replay = await verifyTap(supabase, simulated.payload);
      check(
        "shared authentic → replay is DUPLICATE",
        replay.result === "DUPLICATE" &&
          replay.product_code === sharedBound[0]?.product_code,
        replay.result,
      );
    }

    const extraBind = await bindTag(supabase, {
      product_id: sharedBound[0].id,
      tag_uid: "04EEEEEEEE01",
      manufacturerOrgId: sharedBound[0].manufacturer_org_id,
    });
    check(
      "do not bind a second tag on the shared product",
      !extraBind.ok && extraBind.status === 409,
      extraBind.ok ? "bound again" : extraBind.error,
    );
  }

  console.log("");
  console.log(
    failed === 0
      ? "Full NFC flow through simulate: all passed"
      : `Full NFC flow: ${failed} failed`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
