/**
 * Real backend test for the grievance API — no blockchain involved, pure
 * Supabase + auth. Requires: dev server running with ALLOW_TEST_AUTH=true.
 * Run with: npx tsx scripts/test-real-grievances-e2e.ts
 */
import { createReporter, TEST_BASE } from "./test-helpers";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();
const { check, finish } = createReporter("Real grievance API (Supabase-backed)");

const CONSUMER_A = "0x5a8334871D6FCc868264A9338a11Ff15646d0B83";
const CONSUMER_B = "0x91BB8e08135CFDae2a89444eB641993f10E65a95";
const PRODUCT_ID = "ea3f5027-524b-4ac8-94b4-59c1a27f5117"; // real seeded product

function extractCookie(res: Response): string {
  const cookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") ?? ""];
  const session = cookies.find((c) => c.trim().length > 0);
  if (!session) throw new Error("mock-login did not set a session cookie");
  return session.split(";")[0]!.trim();
}

async function loginAs(walletAddress: string): Promise<string> {
  const res = await fetch(`${TEST_BASE}/api/auth/mock-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ as: "consumer", walletAddress }),
  });
  if (!res.ok) throw new Error(`mock-login failed (${res.status}): ${await res.text()}`);
  return extractCookie(res);
}

async function main() {
  const cookieA = await loginAs(CONSUMER_A);
  const cookieB = await loginAs(CONSUMER_B);

  const shortDescRes = await fetch(`${TEST_BASE}/api/consumer/grievances`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieA },
    body: JSON.stringify({ productId: PRODUCT_ID, category: "OTHER", description: "bad" }),
  });
  check("too-short description is rejected", !shortDescRes.ok, `status ${shortDescRes.status}`);

  const badCategoryRes = await fetch(`${TEST_BASE}/api/consumer/grievances`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieA },
    body: JSON.stringify({
      productId: PRODUCT_ID,
      category: "NOT_A_REAL_CATEGORY",
      description: "This is a long enough description for validation.",
    }),
  });
  check("invalid category is rejected", !badCategoryRes.ok, `status ${badCategoryRes.status}`);

  const createRes = await fetch(`${TEST_BASE}/api/consumer/grievances`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieA },
    body: JSON.stringify({
      productId: PRODUCT_ID,
      category: "DAMAGED_PRODUCT",
      description: "The strap arrived visibly torn on delivery, real end-to-end test.",
    }),
  });
  const createBody = await createRes.json();
  check("real grievance created", createRes.ok, JSON.stringify(createBody));
  check("grievance starts OPEN", createBody.grievance?.status === "OPEN");
  const grievanceId = createBody.grievance?.id as string;

  const listRes = await fetch(`${TEST_BASE}/api/consumer/grievances`, {
    headers: { cookie: cookieA },
  });
  const listBody = await listRes.json();
  check(
    "consumer A sees their own grievance in their list",
    (listBody.grievances ?? []).some((g: { id: string }) => g.id === grievanceId),
  );

  const ownReadRes = await fetch(`${TEST_BASE}/api/consumer/grievances/${grievanceId}`, {
    headers: { cookie: cookieA },
  });
  const ownReadBody = await ownReadRes.json();
  check(
    "consumer A can read their own grievance, with its event timeline",
    ownReadRes.ok && Array.isArray(ownReadBody.grievance?.events) && ownReadBody.grievance.events.length >= 1,
    JSON.stringify(ownReadBody),
  );

  const foreignReadRes = await fetch(`${TEST_BASE}/api/consumer/grievances/${grievanceId}`, {
    headers: { cookie: cookieB },
  });
  check(
    "consumer B cannot read consumer A's grievance (404, not leaked)",
    foreignReadRes.status === 404,
    `status ${foreignReadRes.status}`,
  );

  const foreignListRes = await fetch(`${TEST_BASE}/api/consumer/grievances`, {
    headers: { cookie: cookieB },
  });
  const foreignListBody = await foreignListRes.json();
  check(
    "consumer B's own list does not include consumer A's grievance",
    !(foreignListBody.grievances ?? []).some((g: { id: string }) => g.id === grievanceId),
  );

  const unauthedRes = await fetch(`${TEST_BASE}/api/consumer/grievances`);
  check("unauthenticated request is rejected", unauthedRes.status === 401);

  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
