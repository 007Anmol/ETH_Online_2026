import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { DEMO_PRODUCT_CODE, DEMO_TAG_UID } from "../lib/constants";
import type { Database } from "../lib/database.types";
import { simulateTap } from "../lib/nfc/simulate-tap";
import { signTapPayload } from "../lib/nfc/tap-payload";
import { UNKNOWN_TAP_PAYLOAD } from "../lib/nfc/unknown-tap";
import { verifyTap } from "../lib/nfc/verify-tap";
import { loadEnvFiles } from "./load-env";

const BASE = process.env.NFC_TEST_BASE_URL ?? "http://localhost:3000";

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

  const { data: dummy } = await supabase
    .from("products")
    .select("id, product_code")
    .eq("product_code", DEMO_PRODUCT_CODE)
    .single();
  if (!dummy) throw new Error("Dummy product missing");

  const { data: sharedProduct } = await supabase
    .from("products")
    .select("id, product_code")
    .eq("product_code", "VC-RADO2026-000001")
    .maybeSingle();

  const noNonce = await verifyTap(supabase, {
    tag_uid: DEMO_TAG_UID,
    nonce: "   ",
    cmac: "aa".repeat(16),
  });
  check("whitespace-only nonce is INVALID", noNonce.result === "INVALID");

  const noCmac = await verifyTap(supabase, {
    tag_uid: DEMO_TAG_UID,
    nonce: "abcd",
    cmac: "  ",
  });
  check("whitespace-only cmac is INVALID", noCmac.result === "INVALID");

  const signed = signTapPayload(DEMO_TAG_UID, randomBytes(8).toString("hex"));
  const upperCmac = await verifyTap(supabase, {
    ...signed,
    cmac: signed.cmac.toUpperCase(),
  });
  check("uppercase CMAC still AUTHENTIC", upperCmac.result === "AUTHENTIC");

  const lowerUid = await verifyTap(supabase, {
    ...signTapPayload(DEMO_TAG_UID.toLowerCase(), randomBytes(8).toString("hex")),
    tag_uid: DEMO_TAG_UID.toLowerCase(),
  });
  check("lowercase UID still AUTHENTIC", lowerUid.result === "AUTHENTIC");

  const prefixUid = await verifyTap(supabase, {
    ...signTapPayload(`0x${DEMO_TAG_UID}`, randomBytes(8).toString("hex")),
    tag_uid: `0x${DEMO_TAG_UID}`,
  });
  check("0x UID prefix still AUTHENTIC", prefixUid.result === "AUTHENTIC");

  const mismatched = await simulateTap(supabase, {
    tag_uid: DEMO_TAG_UID,
    product_id: "00000000-0000-4000-8000-000000000000",
  });
  check(
    "simulate tag+wrong product is 404",
    !mismatched.ok && mismatched.status === 404,
  );

  let probeOk = true;
  try {
    await fetch(`${BASE}/scan`);
  } catch {
    probeOk = false;
  }
  if (!probeOk) {
    check("dev server reachable for HTTP edges", false, BASE);
    console.log("");
    console.log(
      failed === 0 ? "Edge checks: all passed" : `Edge checks: ${failed} failed`,
    );
    process.exit(failed === 0 ? 0 : 1);
  }

  const pages = [
    ["/scan", "Check this product"],
    ["/simulator", "NFC simulator"],
    ["/manufacturer/nfc", "RADO-2026-001"],
    [`/product/${dummy.product_code}`, "Factory record"],
    [`/product/${dummy.id}`, dummy.product_code],
  ] as const;

  for (const [path, needle] of pages) {
    const response = await fetch(`${BASE}${path}`);
    const html = await response.text();
    check(`GET ${path}`, response.ok && html.includes(needle));
  }

  const encoded = await fetch(
    `${BASE}/product/${encodeURIComponent(DEMO_PRODUCT_CODE)}`,
  );
  check("GET encoded product code", encoded.ok);

  const bindBadJson = await fetch(`${BASE}/api/nfc/bind`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  check("bind rejects invalid JSON", bindBadJson.status === 400);

  const bindEmpty = await fetch(`${BASE}/api/nfc/bind`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  check("bind empty body is 401 without login", bindEmpty.status === 401);

  const bindSecond = await fetch(`${BASE}/api/nfc/bind`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: dummy.id, tag_uid: "04BBBBBBBB01" }),
  });
  check("HTTP bind without login is 401", bindSecond.status === 401);

  const simJson = await fetch(`${BASE}/api/nfc/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  check("simulate rejects invalid JSON", simJson.status === 400);

  const simByProduct = await fetch(`${BASE}/api/nfc/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: dummy.id }),
  });
  const simBody = (await simByProduct.json()) as {
    payload?: { tag_uid: string; nonce: string; cmac: string };
  };
  check(
    "HTTP simulate by product_id",
    simByProduct.ok && simBody.payload?.tag_uid === DEMO_TAG_UID,
  );

  if (simBody.payload) {
    const first = await fetch(`${BASE}/api/nfc/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(simBody.payload),
    });
    const firstBody = (await first.json()) as {
      result?: string;
      batch_code?: string;
      plant_id?: string;
      product_category?: string;
    };
    check(
      "HTTP verify AUTHENTIC has factory fields",
      first.ok &&
        firstBody.result === "AUTHENTIC" &&
        firstBody.batch_code === "SAACHI-DEV-001" &&
        firstBody.plant_id === "MH-01" &&
        firstBody.product_category === "WATCHES",
    );

    const replay = await fetch(`${BASE}/api/nfc/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(simBody.payload),
    });
    const replayBody = (await replay.json()) as {
      result?: string;
      product_code?: string;
    };
  check(
    "HTTP verify replay is DUPLICATE with product",
    replay.ok &&
      replayBody.result === "DUPLICATE" &&
      replayBody.product_code === DEMO_PRODUCT_CODE,
  );
  }

  if (sharedProduct) {
    const sharedSim = await fetch(`${BASE}/api/nfc/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: sharedProduct.id }),
    });
    const sharedPayload = (await sharedSim.json()) as {
      payload?: { tag_uid: string; nonce: string; cmac: string };
    };
    check("HTTP simulate shared product", sharedSim.ok);
    if (sharedPayload.payload) {
      const sharedAuth = await fetch(`${BASE}/api/nfc/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sharedPayload.payload),
      });
      const sharedAuthBody = (await sharedAuth.json()) as {
        result?: string;
        batch_code?: string;
        product_code?: string;
      };
      check(
        "HTTP shared authentic",
        sharedAuth.ok &&
          sharedAuthBody.result === "AUTHENTIC" &&
          sharedAuthBody.batch_code === "RADO-2026-001",
        sharedAuthBody.result,
      );
      const sharedReplay = await fetch(`${BASE}/api/nfc/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sharedPayload.payload),
      });
      const sharedReplayBody = (await sharedReplay.json()) as {
        result?: string;
      };
      check(
        "HTTP shared replay",
        sharedReplay.ok && sharedReplayBody.result === "DUPLICATE",
      );
    }
  }

  const invalidScan = await fetch(`${BASE}/api/nfc/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(UNKNOWN_TAP_PAYLOAD),
  });
  const invalidBody = (await invalidScan.json()) as { result?: string };
  check(
    "unknown chip is not verified",
    invalidScan.ok && invalidBody.result === "INVALID",
  );

  const { data: latest } = await supabase
    .from("verification_attempts")
    .select("result")
    .eq("product_id", dummy.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(
    "unknown scan URL did not overwrite dummy last result",
    latest?.result === "DUPLICATE",
    latest?.result,
  );

  const { data: stillPending } = await supabase
    .from("products")
    .select("product_code")
    .like("product_code", "VC-RADO%")
    .eq("status", "TAG_PENDING");
  check(
    "shared batch still has unbound units",
    (stillPending?.length ?? 0) === 2,
    `unbound=${stillPending?.length ?? 0}`,
  );

  console.log("");
  console.log(
    failed === 0 ? "Edge checks: all passed" : `Edge checks: ${failed} failed`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
