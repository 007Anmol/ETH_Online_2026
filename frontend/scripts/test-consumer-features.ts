/**
 * Acceptance test for CONSUMER_BACKEND_PLAN.md — Transfer, Resale, Grievance.
 *
 * This intentionally FAILS today: none of the `app/api/consumer/**` routes it
 * exercises exist yet (the three features are still mock-only, see
 * `lib/consumer/mock/*`). Treat a fully green run of this script as the
 * acceptance test for CONSUMER_BACKEND_PLAN.md phases 1-8, not as a bug to
 * silence. It also assumes the test-harness prerequisite described in that
 * plan's Phase 4 ("mock-login as consumerA/consumerB" + two seeded owned
 * products) has been added.
 *
 * Run with: npm run test:consumer-features
 */
import { TEST_BASE, createReporter, requireApp } from "./test-helpers";

const { check, finish } = createReporter("Consumer features (transfer/resale/grievance)");

type LoginAs = "consumerA" | "consumerB";

function extractCookie(res: Response): string {
  const cookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") ?? ""];
  const session = cookies.find((cookie) => cookie.trim().length > 0);
  if (!session) throw new Error("mock-login did not set a session cookie");
  return session.split(";")[0]!.trim();
}

async function loginAs(as: LoginAs): Promise<string> {
  const res = await fetch(`${TEST_BASE}/api/auth/mock-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ as }),
  });
  if (!res.ok) {
    throw new Error(`mock-login as ${as} failed (${res.status}): ${await res.text()}`);
  }
  return extractCookie(res);
}

async function api(path: string, cookie: string, init: RequestInit = {}) {
  return fetch(`${TEST_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      cookie,
      ...(init.headers ?? {}),
    },
  });
}

function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Fetches the current consumer's owned products via the existing mock-backed
 * endpoint shape described in CONSUMER_API_PLAN.md. Adjust the path here once
 * the real `GET /api/consumer/products` (or equivalent) lands — this script
 * is the executable spec, expected to be edited alongside Phase 4/5, not run
 * unmodified forever.
 */
async function firstOwnedProductId(cookie: string): Promise<string> {
  const res = await api("/api/consumer/products?owned=true", cookie);
  if (!res.ok) {
    throw new Error(
      `Could not list owned products (${res.status}). Seed a product for this ` +
        "consumer per CONSUMER_BACKEND_PLAN.md Phase 4's test-harness prerequisite.",
    );
  }
  const body = (await res.json()) as { products?: { id: string }[] };
  const productId = body.products?.[0]?.id;
  if (!productId) throw new Error("Consumer owns no products — seed data missing.");
  return productId;
}

async function testDirectTransfer(cookieA: string) {
  const productId = await firstOwnedProductId(cookieA);
  const key = uuid();

  const create = await api("/api/consumer/transfers", cookieA, {
    method: "POST",
    body: JSON.stringify({
      productId,
      toWalletAddress: "0x000000000000000000000000000000000000b0b",
      idempotencyKey: key,
    }),
  });
  check("transfer create returns 201/200", create.ok, `status ${create.status}`);
  const created = (await create.json().catch(() => ({}))) as { id?: string; status?: string };
  check("transfer starts PENDING", created.status === "PENDING", created.status);

  const retry = await api("/api/consumer/transfers", cookieA, {
    method: "POST",
    body: JSON.stringify({
      productId,
      toWalletAddress: "0x000000000000000000000000000000000000b0b",
      idempotencyKey: key,
    }),
  });
  const retried = (await retry.json().catch(() => ({}))) as { id?: string };
  check(
    "retrying the same idempotencyKey does not create a second transfer",
    retried.id === created.id,
  );

  if (!created.id) return;
  const status = await api(`/api/consumer/transfers/${created.id}`, cookieA);
  const finalState = (await status.json().catch(() => ({}))) as { status?: string };
  check(
    "transfer eventually reaches CONFIRMED or FAILED (never left PENDING forever)",
    finalState.status === "CONFIRMED" || finalState.status === "FAILED",
    finalState.status,
  );

  const selfTransfer = await api("/api/consumer/transfers", cookieA, {
    method: "POST",
    body: JSON.stringify({
      productId,
      toWalletAddress: "0x000000000000000000000000000000000000b0b",
      idempotencyKey: uuid(),
    }),
  });
  // Only meaningful if the product is still owned by A at this point; if the
  // transfer above confirmed, A no longer owns it and this should 403/404
  // instead for a different reason. Either way it must not succeed.
  check("self/foreign-owner transfer edge case does not silently succeed", !selfTransfer.ok || selfTransfer.status !== 200);
}

async function testResaleSuccess(cookieA: string, cookieB: string) {
  const productId = await firstOwnedProductId(cookieA);

  const listingRes = await api("/api/consumer/marketplace/listings", cookieA, {
    method: "POST",
    body: JSON.stringify({ productId, priceAmount: 20, currency: "HBAR" }),
  });
  check("listing create succeeds", listingRes.ok, `status ${listingRes.status}`);
  const listing = (await listingRes.json().catch(() => ({}))) as { id?: string; status?: string };
  check("listing starts ACTIVE", listing.status === "ACTIVE", listing.status);
  if (!listing.id) return;

  const purchase = await api(
    `/api/consumer/marketplace/listings/${listing.id}/purchase`,
    cookieB,
    { method: "POST", body: JSON.stringify({ idempotencyKey: uuid() }) },
  );
  check("purchase accepted", purchase.ok, `status ${purchase.status}`);
  const settlement = (await purchase.json().catch(() => ({}))) as { id?: string };
  if (!settlement.id) return;

  const finalStatus = await api(`/api/consumer/marketplace/settlements/${settlement.id}`, cookieB);
  const finalBody = (await finalStatus.json().catch(() => ({}))) as { status?: string };
  check(
    "settlement reaches COMPLETED (never claims success on a mock adapter without saying so)",
    finalBody.status === "COMPLETED",
    finalBody.status,
  );

  const listingAfter = await api(`/api/consumer/marketplace/listings/${listing.id}`, cookieB);
  const listingAfterBody = (await listingAfter.json().catch(() => ({}))) as { status?: string };
  check("listing is SOLD after a completed settlement", listingAfterBody.status === "SOLD");
}

async function testDoubleBuy(cookieA: string, cookieB: string, cookieC: string) {
  const productId = await firstOwnedProductId(cookieA);
  const listingRes = await api("/api/consumer/marketplace/listings", cookieA, {
    method: "POST",
    body: JSON.stringify({ productId, priceAmount: 15, currency: "HBAR" }),
  });
  const listing = (await listingRes.json().catch(() => ({}))) as { id?: string };
  if (!listing.id) {
    check("double-buy test could run", false, "listing creation failed");
    return;
  }

  const [buyB, buyC] = await Promise.all([
    api(`/api/consumer/marketplace/listings/${listing.id}/purchase`, cookieB, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: uuid() }),
    }),
    api(`/api/consumer/marketplace/listings/${listing.id}/purchase`, cookieC, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: uuid() }),
    }),
  ]);

  const outcomes = [buyB.ok, buyC.ok];
  const successCount = outcomes.filter(Boolean).length;
  check(
    "exactly one concurrent purchase succeeds, the other gets a clean conflict (not a 500)",
    successCount === 1 && buyB.status !== 500 && buyC.status !== 500,
    `buyB=${buyB.status} buyC=${buyC.status}`,
  );
}

async function testGrievanceIsolation(cookieA: string, cookieB: string) {
  const productId = await firstOwnedProductId(cookieA);

  const create = await api("/api/consumer/grievances", cookieA, {
    method: "POST",
    body: JSON.stringify({
      productId,
      category: "DAMAGED_PRODUCT",
      description: "Strap arrived torn on delivery.",
    }),
  });
  check("grievance create succeeds", create.ok, `status ${create.status}`);
  const grievance = (await create.json().catch(() => ({}))) as { id?: string; status?: string };
  check("grievance starts OPEN", grievance.status === "OPEN", grievance.status);
  if (!grievance.id) return;

  const ownList = await api("/api/consumer/grievances", cookieA);
  const ownListBody = (await ownList.json().catch(() => ({}))) as { grievances?: { id: string }[] };
  check(
    "consumer sees their own grievance in their list",
    (ownListBody.grievances ?? []).some((entry) => entry.id === grievance.id),
  );

  const foreignRead = await api(`/api/consumer/grievances/${grievance.id}`, cookieB);
  check(
    "a different consumer cannot read this grievance",
    foreignRead.status === 404 || foreignRead.status === 403,
    `status ${foreignRead.status}`,
  );

  const shortDescription = await api("/api/consumer/grievances", cookieA, {
    method: "POST",
    body: JSON.stringify({ productId, category: "OTHER", description: "bad" }),
  });
  check(
    "grievance with too-short description is rejected",
    !shortDescription.ok,
    `status ${shortDescription.status}`,
  );
}

async function main() {
  await requireApp();

  console.log("Logging in as two demo consumers (see CONSUMER_BACKEND_PLAN.md Phase 4 prerequisite)...");
  const [cookieA, cookieB] = await Promise.all([loginAs("consumerA"), loginAs("consumerB")]);

  console.log("\n-- Test 1: direct transfer --");
  await testDirectTransfer(cookieA);

  console.log("\n-- Test 2: resale success --");
  await testResaleSuccess(cookieA, cookieB);

  console.log("\n-- Test 3: resale settlement blocked on a flagged product --");
  check(
    "SUSPECT_COUNTERFEIT gate — write this once a way to flag a test product exists (Phase 3.2)",
    false,
    "not yet automatable: needs an authorized 'flag product' fixture endpoint",
  );

  console.log("\n-- Test 4: double buy --");
  // A third identity as an independent buyer; reuse consumerB's cookie as a
  // stand-in "buyer C" is wrong (same profile), so this needs its own seed —
  // flagged rather than faked.
  check(
    "double-buy race — needs a seeded third consumer (consumerC) per Phase 4 prerequisite",
    false,
    "extend loginAs()/mock-login with a consumerC identity before enabling this",
  );

  console.log("\n-- Test 5: grievance isolation --");
  await testGrievanceIsolation(cookieA, cookieB);

  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
