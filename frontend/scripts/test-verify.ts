import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { DEMO_PRODUCT_CODE, DEMO_TAG_UID } from "../lib/constants";
import type { Database } from "../lib/database.types";
import { aesCmac, parseAes128Key } from "../lib/nfc/cmac";
import { bindTag } from "../lib/nfc/bind-tag";
import { signTapPayload } from "../lib/nfc/tap-payload";
import { verifyTap } from "../lib/nfc/verify-tap";
import { loadEnvFiles } from "./load-env";

function expect(name: string, ok: boolean, detail?: string) {
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
    if (!expect(name, ok, detail)) failed += 1;
  };

  const rfcKey = parseAes128Key("2b7e151628aed2a6abf7158809cf4f3c");
  const rfcEmpty = aesCmac(rfcKey, Buffer.alloc(0)).toString("hex");
  check(
    "AES-CMAC RFC 4493 empty message",
    rfcEmpty === "bb1d6929e95937287fa37d129b756746",
    rfcEmpty,
  );
  const rfcBlock = aesCmac(
    rfcKey,
    Buffer.from("6bc1bee22e409f96e93d7e117393172a", "hex"),
  ).toString("hex");
  check(
    "AES-CMAC RFC 4493 one-block message",
    rfcBlock === "070a16b46b4d4144f79bdd9dd04a287c",
    rfcBlock,
  );

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("product_code", DEMO_PRODUCT_CODE)
    .single();
  if (!product) throw new Error("Dummy product missing");

  const { data: tag } = await supabase
    .from("nfc_tags")
    .select("id, status")
    .eq("tag_uid", DEMO_TAG_UID)
    .eq("status", "BOUND")
    .maybeSingle();

  if (!tag) {
    const bound = await bindTag(supabase, {
      product_id: product.id,
      tag_uid: DEMO_TAG_UID,
    });
    if (!bound.ok) throw new Error(bound.error);
  }

  const missing = await verifyTap(supabase, {
    tag_uid: "",
    nonce: "",
    cmac: "",
  });
  check(
    "empty payload is INVALID",
    missing.result === "INVALID" && missing.httpStatus === 400,
  );

  const unknown = await verifyTap(supabase, {
    tag_uid: "04FFFFFFFFFF",
    nonce: "n1",
    cmac: "aa".repeat(16),
  });
  check("unknown tag is INVALID", unknown.result === "INVALID");

  const badStamp = await verifyTap(supabase, {
    tag_uid: DEMO_TAG_UID,
    nonce: randomBytes(8).toString("hex"),
    cmac: "bb".repeat(16),
  });
  check("bad CMAC is INVALID", badStamp.result === "INVALID");

  const payload = signTapPayload(DEMO_TAG_UID, randomBytes(8).toString("hex"));
  const first = await verifyTap(supabase, payload);
  check(
    "new signed tap is AUTHENTIC",
    first.result === "AUTHENTIC" && first.product_code === DEMO_PRODUCT_CODE,
    JSON.stringify(first),
  );

  const replay = await verifyTap(supabase, payload);
  check(
    "same payload is DUPLICATE",
    replay.result === "DUPLICATE" && replay.product_code === DEMO_PRODUCT_CODE,
    JSON.stringify(replay),
  );

  const colonPayload = signTapPayload("04:de:ad:be:ef:01", randomBytes(8).toString("hex"));
  const spaced = await verifyTap(supabase, {
    ...colonPayload,
    tag_uid: " 04:DE:AD:BE:EF:01 ",
  });
  check(
    "colon and spaces in UID still verify",
    spaced.result === "AUTHENTIC" && spaced.batch_code === "SAACHI-DEV-001",
    spaced.result,
  );

  const { count } = await supabase
    .from("verification_attempts")
    .select("id", { count: "exact", head: true })
    .eq("product_id", product.id);

  check(
    "attempts were saved",
    (count ?? 0) >= 3,
    `count=${count}`,
  );

  console.log("");
  console.log(failed === 0 ? "Verify API checks: all passed" : `Verify API checks: ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
