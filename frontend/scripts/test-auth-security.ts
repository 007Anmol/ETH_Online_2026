import { TEST_BASE, createReporter, requireApp } from "./test-helpers";

const { check, finish } = createReporter("Authentication security");

async function main() {
  await requireApp();

  const mockLogin = await fetch(`${TEST_BASE}/api/auth/mock-login`, { method: "POST" });
  check("mock-login is disabled by default", mockLogin.status === 404);

  const unauthenticatedBatch = await fetch(`${TEST_BASE}/api/batches`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      product_name: "Unauthorized",
      batch_code: `SECURITY-${Date.now()}`,
      plant_id: "TEST",
      quantity: 1,
      product_category: "WATCHES",
    }),
  });
  check("unauthenticated batch writes are rejected", unauthenticatedBatch.status === 401);

  const unauthenticatedProducts = await fetch(`${TEST_BASE}/api/products`);
  check("unauthenticated product reads are rejected", unauthenticatedProducts.status === 401);

  const unauthenticatedReconcile = await fetch(`${TEST_BASE}/api/manufacturing/reconcile`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operationId: "not-authorized" }),
  });
  check("unauthenticated reconciliation is rejected", unauthenticatedReconcile.status === 401);

  const unauthenticatedDeploy = await fetch(`${TEST_BASE}/api/deploy`);
  check("unauthenticated deployment is rejected", unauthenticatedDeploy.status === 401);

  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});