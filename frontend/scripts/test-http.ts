import { DEMO_PRODUCT_CODE } from "../lib/constants";
import { loadEnvFiles } from "./load-env";

const BASE = process.env.NFC_TEST_BASE_URL ?? "http://localhost:3000";

function expect(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

async function main() {
  loadEnvFiles();
  let failed = 0;
  const check = (name: string, ok: boolean, detail?: string) => {
    if (!expect(name, ok, detail)) failed += 1;
  };

  let probe: Response;
  try {
    probe = await fetch(`${BASE}/scan`);
  } catch (error) {
    console.error(
      `Could not reach ${BASE}. Start the app with npm run dev.`,
    );
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  check("GET /scan", probe.ok);
  const scanHtml = await probe.text();
  check("scan page copy", scanHtml.includes("Check this product"));

  const product = await fetch(`${BASE}/product/${DEMO_PRODUCT_CODE}`);
  const productHtml = await product.text();
  check("GET /product/:code", product.ok);
  check("product shows batch", productHtml.includes("SAACHI-DEV-001"));
  check("product shows plant", productHtml.includes("MH-01"));
  check("product shows factory record", productHtml.includes("Factory record"));

  const shared = await fetch(`${BASE}/product/VC-RADO2026-000001`);
  const sharedHtml = await shared.text();
  check("GET shared demo product", shared.ok);
  check("shared product shows RADO batch", sharedHtml.includes("RADO-2026-001"));

  const missing = await fetch(`${BASE}/product/does-not-exist`);
  check("unknown product is 404", missing.status === 404);

  const badJson = await fetch(`${BASE}/api/nfc/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  check("verify rejects invalid JSON", badJson.status === 400);

  const emptyVerify = await fetch(`${BASE}/api/nfc/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const emptyBody = (await emptyVerify.json()) as { result?: string };
  check(
    "verify empty body is INVALID",
    emptyVerify.status === 400 && emptyBody.result === "INVALID",
  );

  const emptySim = await fetch(`${BASE}/api/nfc/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  check("simulate empty body is 400", emptySim.status === 400);

  const simulated = await fetch(`${BASE}/api/nfc/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tag_uid: "04DEADBEEF01" }),
  });
  const generated = (await simulated.json()) as {
    payload?: { tag_uid: string; nonce: string; cmac: string };
  };
  check("HTTP simulate", simulated.ok && Boolean(generated.payload));

  if (generated.payload) {
    const first = await fetch(`${BASE}/api/nfc/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(generated.payload),
    });
    const firstBody = (await first.json()) as { result?: string };
    check(
      "verify first tap is AUTHENTIC",
      first.ok && firstBody.result === "AUTHENTIC",
    );

    const second = await fetch(`${BASE}/api/nfc/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(generated.payload),
    });
    const secondBody = (await second.json()) as { result?: string };
    check(
      "verify replay is DUPLICATE",
      second.ok && secondBody.result === "DUPLICATE",
    );

    const scanLink = await fetch(
      `${BASE}/scan?${new URLSearchParams(generated.payload).toString()}`,
    );
    check(
      "GET /scan with payload does not consume a nonce",
      scanLink.ok && (await scanLink.text()).includes("Check this product"),
    );

    const after = await fetch(`${BASE}/product/${DEMO_PRODUCT_CODE}`);
    const afterHtml = await after.text();
    check(
      "product page last result is duplicate warning",
      afterHtml.includes("Duplicate scan"),
    );
  }

  console.log("");
  console.log(
    failed === 0 ? "HTTP / page checks: all passed" : `HTTP / page checks: ${failed} failed`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
