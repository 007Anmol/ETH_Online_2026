import { createClient } from "@supabase/supabase-js";
import { DEMO_PRODUCT_CODE, DEMO_TAG_UID } from "../lib/constants";
import type { Database } from "../lib/database.types";
import { simulateTap } from "../lib/nfc/simulate-tap";
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

  const missing = await simulateTap(supabase, {});
  check("reject missing tag and product", !missing.ok && missing.status === 400);

  const unknown = await simulateTap(supabase, { tag_uid: "04FFFFFFFFFF" });
  check("reject unbound tag", !unknown.ok && unknown.status === 404);

  const { data: dummy } = await supabase
    .from("products")
    .select("id")
    .eq("product_code", DEMO_PRODUCT_CODE)
    .single();

  const byProduct = dummy
    ? await simulateTap(supabase, { product_id: dummy.id })
    : { ok: false as const, status: 500, error: "missing dummy" };
  check(
    "simulate by product_id",
    byProduct.ok && byProduct.payload.tag_uid === DEMO_TAG_UID,
  );

  const first = await simulateTap(supabase, { tag_uid: DEMO_TAG_UID });
  const second = await simulateTap(supabase, { tag_uid: DEMO_TAG_UID });

  check("first simulate succeeds", first.ok, first.ok ? undefined : first.error);
  check("second simulate succeeds", second.ok, second.ok ? undefined : second.error);

  if (first.ok && second.ok) {
    check(
      "each simulate gets a new nonce",
      first.payload.nonce !== second.payload.nonce,
    );
    check("payload includes cmac", Boolean(first.payload.cmac));

    const authentic = await verifyTap(supabase, first.payload);
    check("simulated tap verifies AUTHENTIC", authentic.result === "AUTHENTIC");

    const replay = await verifyTap(supabase, first.payload);
    check("replaying simulated payload is DUPLICATE", replay.result === "DUPLICATE");
  }

  console.log("");
  console.log(
    failed === 0
      ? "Simulate API checks: all passed"
      : `Simulate API checks: ${failed} failed`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
