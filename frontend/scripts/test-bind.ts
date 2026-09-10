import { createClient } from "@supabase/supabase-js";
import { DEMO_PRODUCT_CODE, DEMO_TAG_UID } from "../lib/constants";
import type { Database } from "../lib/database.types";
import { bindTag, type BindTagResult } from "../lib/nfc/bind-tag";
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
  const fail = (name: string, detail?: string) => {
    failed += 1;
    expect(name, false, detail);
  };
  const pass = (name: string, detail?: string) => expect(name, true, detail);

  const { data: dummy } = await supabase
    .from("products")
    .select("id, product_code, status")
    .eq("product_code", DEMO_PRODUCT_CODE)
    .single();

  if (!dummy) {
    throw new Error("Dummy product missing. Run npm run seed then bind.");
  }

  const { data: dummyTags } = await supabase
    .from("nfc_tags")
    .select("id, tag_uid, status, product_id")
    .eq("product_id", dummy.id);

  const boundTags = (dummyTags ?? []).filter((tag) => tag.status === "BOUND");
  dummy.status === "TAG_BOUND" && boundTags.length === 1
    ? pass("dummy product status matches one BOUND tag")
    : fail(
        "dummy product status matches one BOUND tag",
        `status=${dummy.status} boundTags=${boundTags.length}`,
      );

  boundTags[0]?.tag_uid === DEMO_TAG_UID
    ? pass("dummy tag UID is 04DEADBEEF01")
    : fail("dummy tag UID is 04DEADBEEF01", boundTags[0]?.tag_uid);

  const { count: historyCount } = await supabase
    .from("tag_binding_history")
    .select("id", { count: "exact", head: true })
    .eq("product_id", dummy.id)
    .eq("action", "BOUND");

  historyCount === 1
    ? pass("dummy has one BOUND history row")
    : fail("dummy has one BOUND history row", `count=${historyCount}`);

  const { count: eventCount } = await supabase
    .from("product_events")
    .select("id", { count: "exact", head: true })
    .eq("product_id", dummy.id)
    .eq("event_type", "TAG_BOUND");

  eventCount === 1
    ? pass("dummy has one TAG_BOUND event")
    : fail("dummy has one TAG_BOUND event", `count=${eventCount}`);

  const cases: { name: string; input: Parameters<typeof bindTag>[1]; check: (r: BindTagResult) => boolean }[] =
    [
      {
        name: "reject empty product_id",
        input: { product_id: "", tag_uid: DEMO_TAG_UID },
        check: (r) => !r.ok && r.status === 400,
      },
      {
        name: "reject empty tag_uid",
        input: { product_id: dummy.id, tag_uid: "" },
        check: (r) => !r.ok && r.status === 400,
      },
      {
        name: "reject invalid tag_uid",
        input: { product_id: dummy.id, tag_uid: "not-a-tag" },
        check: (r) => !r.ok && r.status === 400,
      },
      {
        name: "reject tag_uid shorter than 8 hex",
        input: { product_id: dummy.id, tag_uid: "04AABB" },
        check: (r) => !r.ok && r.status === 400,
      },
      {
        name: "reject tag_uid longer than 20 hex",
        input: { product_id: dummy.id, tag_uid: "04AABBCCDDEEFF00112233" },
        check: (r) => !r.ok && r.status === 400,
      },
      {
        name: "reject unknown product",
        input: {
          product_id: "00000000-0000-0000-0000-000000000000",
          tag_uid: "04AAAAAAAA01",
        },
        check: (r) => !r.ok && r.status === 404,
      },
      {
        name: "reject unknown product code",
        input: {
          product_id: "VC-DOES-NOT-EXIST",
          tag_uid: "04AAAAAAAA01",
        },
        check: (r) => !r.ok && r.status === 404,
      },
      {
        name: "product_code of dummy is already bound",
        input: { product_id: DEMO_PRODUCT_CODE, tag_uid: "04BBBBBBBB02" },
        check: (r) => !r.ok && r.status === 409,
      },
      {
        name: "reject second tag on dummy product",
        input: { product_id: dummy.id, tag_uid: "04BBBBBBBB01" },
        check: (r) => !r.ok && r.status === 409 && r.error.includes("already has a bound tag"),
      },
      {
        name: "treat 04:de:ad:be:ef:01 as the same dummy tag",
        input: { product_id: dummy.id, tag_uid: "04:de:ad:be:ef:01" },
        check: (r) => !r.ok && r.status === 409,
      },
    ];

  const { data: other } = await supabase
    .from("products")
    .select("id, product_code")
    .eq("status", "TAG_PENDING")
    .limit(1)
    .maybeSingle();

  if (other) {
    cases.push({
      name: "reject dummy tag on a different product",
      input: { product_id: other.id, tag_uid: DEMO_TAG_UID },
      check: (r) =>
        !r.ok && r.status === 409 && r.error.includes("already bound"),
    });
    cases.push({
      name: "reject dummy tag with 0x prefix on a different product",
      input: { product_id: other.id, tag_uid: `0x${DEMO_TAG_UID}` },
      check: (r) => !r.ok && r.status === 409,
    });
  } else {
    fail("found a TAG_PENDING product to test tag reuse");
  }

  for (const testCase of cases) {
    const result = await bindTag(supabase, testCase.input);
    testCase.check(result)
      ? pass(testCase.name)
      : fail(testCase.name, JSON.stringify(result));
  }

  const { data: manufacturerPending } = await supabase
    .from("products")
    .select("id, product_code, status")
    .eq("status", "TAG_PENDING")
    .neq("product_code", DEMO_PRODUCT_CODE);
  const stillPending = manufacturerPending?.length ?? 0;
  stillPending >= 1
    ? pass("left manufacturer products unbound", `pending=${stillPending}`)
    : fail("left manufacturer products unbound", "no pending manufacturer products");

  console.log("");
  console.log(failed === 0 ? "Bind API checks: all passed" : `Bind API checks: ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
