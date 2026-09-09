import { TEST_BASE, createReporter, requireApp } from "./test-helpers";

const { check, finish } = createReporter("Real authenticated manufacturer flow");

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} to a browser session cookie before running this test.`);
  return value;
}

async function main() {
  await requireApp();

  const firstLoginCookie = required("AUTH_TEST_COOKIE_FIRST_LOGIN");
  const secondManufacturerCookie = process.env.AUTH_TEST_COOKIE_SECOND_MANUFACTURER;
  const reloginCookie = process.env.AUTH_TEST_COOKIE_RELOGIN;
  const batchCode = `REAL-AUTH-${Date.now()}`;

  const session = await fetch(`${TEST_BASE}/api/auth/session`, {
    headers: { Cookie: firstLoginCookie },
  });
  const sessionBody = (await session.json()) as { session?: { role?: string } };
  check("real authenticated session is accepted", session.ok);
  check("backend session role is MANUFACTURER", sessionBody.session?.role === "MANUFACTURER");

  const create = await fetch(`${TEST_BASE}/api/batches`, {
    method: "POST",
    headers: { "content-type": "application/json", Cookie: firstLoginCookie },
    body: JSON.stringify({
      product_name: "Real Auth Acceptance Product",
      batch_code: batchCode,
      plant_id: "REAL-AUTH",
      quantity: 2,
      product_category: "WATCHES",
    }),
  });
  const created = (await create.json()) as { batch?: { id?: string }; products?: unknown[]; error?: string };
  check("authenticated manufacturer can create a batch", create.status === 201, created.error);
  check("authenticated batch creates products", created.products?.length === 2);

  const afterCreate = await fetch(`${TEST_BASE}/api/batches`, {
    headers: { Cookie: firstLoginCookie },
  });
  const afterCreateBody = (await afterCreate.json()) as { batches?: Array<{ batch_code: string }> };
  check("created batch is persisted", afterCreateBody.batches?.some((batch) => batch.batch_code === batchCode) === true);

  if (secondManufacturerCookie) {
    const otherManufacturer = await fetch(`${TEST_BASE}/api/batches`, {
      headers: { Cookie: secondManufacturerCookie },
    });
    const otherBody = (await otherManufacturer.json()) as { batches?: Array<{ batch_code: string }> };
    check("manufacturer B cannot read manufacturer A batch", !otherBody.batches?.some((batch) => batch.batch_code === batchCode));
  }

  if (reloginCookie) {
    const afterRelogin = await fetch(`${TEST_BASE}/api/batches`, {
      headers: { Cookie: reloginCookie },
    });
    const reloginBody = (await afterRelogin.json()) as { batches?: Array<{ batch_code: string }> };
    check("batch survives logout and real re-login", reloginBody.batches?.some((batch) => batch.batch_code === batchCode) === true);
  }

  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});