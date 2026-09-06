import { PRODUCT_CATEGORIES, productCategoryLabel, type ProductCategory } from "../lib/types";
import {
  TEST_BASE,
  TEST_BATCH_PREFIX,
  createReporter,
  deleteHarnessBatches,
  loginCookie,
  requireApp,
  serviceClient,
} from "./test-helpers";

type BatchRow = {
  id: string;
  batch_code: string;
  product_name: string;
  product_category: ProductCategory;
  plant_id: string;
  manufacturing_date: string;
  quantity: number;
  minted_count: number;
  status: string;
  batch_id_hash: string;
  expiry_date?: string | null;
};

type ProductRow = {
  id: string;
  product_code: string;
  serial_number: string;
  status: string;
  product_id_hash: string;
  batch_id: string;
};

type BatchResponse = { batch?: BatchRow; products?: ProductRow[]; error?: string };
type ListResponse = { batches?: BatchRow[]; error?: string };
type ProductsResponse = { products?: ProductRow[]; error?: string };

const { check, finish } = createReporter("Manufacturing / batch API");

function slug(batchCode: string) {
  return batchCode.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

async function postBatch(
  cookie: string | null,
  body: unknown,
  raw = false,
) {
  return fetch(`${TEST_BASE}/api/batches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

async function main() {
  await requireApp();
  const supabase = serviceClient();
  await deleteHarnessBatches(supabase);

  const noAuth = await postBatch(null, {
    product_name: "Should Fail",
    batch_code: `${TEST_BATCH_PREFIX}NOAUTH`,
    plant_id: "PLANT-01",
    quantity: 1,
    product_category: "WATCHES",
  });
  check("POST /api/batches without login is 401", noAuth.status === 401);

  const cookie = await loginCookie();

  const badJson = await postBatch(cookie, "{", true);
  check("POST /api/batches rejects invalid JSON", badJson.status === 400);

  const missingName = await postBatch(cookie, {
    product_name: "  ",
    batch_code: `${TEST_BATCH_PREFIX}MISS`,
    plant_id: "PLANT-01",
    quantity: 1,
    product_category: "WATCHES",
  });
  check("blank product_name is 400", missingName.status === 400);

  const legacyCategory = await postBatch(cookie, {
    product_name: "Captain Cook",
    batch_code: `${TEST_BATCH_PREFIX}LEGACY`,
    plant_id: "PLANT-01",
    quantity: 1,
    product_category: "Luxury watch",
  });
  const legacyBody = (await legacyCategory.json()) as { error?: string };
  check(
    "legacy free-text category is 400",
    legacyCategory.status === 400 && Boolean(legacyBody.error?.includes("product_category")),
    legacyBody.error,
  );

  const lowerCategory = await postBatch(cookie, {
    product_name: "Captain Cook",
    batch_code: `${TEST_BATCH_PREFIX}LOWER`,
    plant_id: "PLANT-01",
    quantity: 1,
    product_category: "watches",
  });
  check("lowercase category is 400", lowerCategory.status === 400);

  for (const quantity of [0, -1, 1.5, 101]) {
    const res = await postBatch(cookie, {
      product_name: "Captain Cook",
      batch_code: `${TEST_BATCH_PREFIX}QTY-${quantity}`,
      plant_id: "PLANT-01",
      quantity,
      product_category: "WATCHES",
    });
    check(`quantity ${quantity} is 400`, res.status === 400);
  }

  const expiryPayload = await postBatch(cookie, {
    product_name: "Captain Cook",
    batch_code: `${TEST_BATCH_PREFIX}BAGS-01`,
    plant_id: "PLANT-CH-01",
    quantity: 2,
    product_category: "BAGS",
    expiry_date: "2028-01-01",
    manufacturing_date: "1999-01-01",
  });
  const created = (await expiryPayload.json()) as BatchResponse;
  check("create BAGS batch of 2", expiryPayload.status === 201, created.error);
  check("created category is BAGS", created.batch?.product_category === "BAGS");
  check("created status is MINTED", created.batch?.status === "MINTED");
  check("minted_count matches quantity", created.batch?.minted_count === 2);
  check(
    "client manufacturing_date is ignored",
    created.batch?.manufacturing_date === new Date().toISOString().slice(0, 10),
    created.batch?.manufacturing_date,
  );
  check(
    "expiry_date is not stored",
    created.batch !== undefined && !("expiry_date" in created.batch),
  );
  check("hash uses 0x sha256 prefix", /^0x[0-9a-f]{64}$/.test(created.batch?.batch_id_hash ?? ""));
  check("two product twins were minted", created.products?.length === 2);

  const expectedSlug = slug("HARNESS-BAGS-01");
  check(
    "product codes use the full batch slug",
    created.products?.[0]?.product_code === `VC-${expectedSlug}-000001` &&
      created.products?.[1]?.product_code === `VC-${expectedSlug}-000002`,
    created.products?.map((p) => p.product_code).join(","),
  );
  check(
    "products start as TAG_PENDING",
    created.products?.every((p) => p.status === "TAG_PENDING") === true,
  );
  check(
    "product hashes use placeholderHash",
    created.products?.every((p) => /^0x[0-9a-f]{64}$/.test(p.product_id_hash)) === true,
  );

  const duplicate = await postBatch(cookie, {
    product_name: "Captain Cook",
    batch_code: `${TEST_BATCH_PREFIX}BAGS-01`,
    plant_id: "PLANT-CH-01",
    quantity: 2,
    product_category: "BAGS",
  });
  check("duplicate batch_code is 409", duplicate.status === 409);

  const listed = await fetch(`${TEST_BASE}/api/batches`, {
    headers: { Cookie: cookie },
  });
  const listedBody = (await listed.json()) as ListResponse;
  const listedBatch = listedBody.batches?.find((b) => b.batch_code === "HARNESS-BAGS-01");
  check("GET /api/batches includes the new batch", listed.ok && Boolean(listedBatch));
  check("listed batch category is BAGS", listedBatch?.product_category === "BAGS");
  check(
    "listed batch has no expiry_date",
    listedBatch !== undefined && !("expiry_date" in listedBatch),
  );

  const products = await fetch(
    `${TEST_BASE}/api/products?batch_id=${created.batch?.id ?? ""}`,
    { headers: { Cookie: cookie } },
  );
  const productsBody = (await products.json()) as ProductsResponse;
  check(
    "GET /api/products?batch_id= returns both twins",
    products.ok && productsBody.products?.length === 2,
    `count=${productsBody.products?.length ?? 0}`,
  );

  const publicPage = await fetch(
    `${TEST_BASE}/product/${created.products?.[0]?.product_code}`,
  );
  const publicHtml = await publicPage.text();
  check("public product page loads", publicPage.ok);
  check("public page shows Bags", publicHtml.includes("Bags"));
  check("public page does not show Expiry", !/expir/i.test(publicHtml));
  check("public page shows batch code", publicHtml.includes("HARNESS-BAGS-01"));

  const factoryPage = await fetch(
    `${TEST_BASE}/manufacturer/products/${created.products?.[0]?.id}`,
    { headers: { Cookie: cookie } },
  );
  const factoryHtml = await factoryPage.text();
  check("factory product page loads", factoryPage.ok);
  check("factory page shows Bags", factoryHtml.includes("Bags"));
  check("factory page does not show Expiry", !/expir/i.test(factoryHtml));

  const batchesPage = await fetch(`${TEST_BASE}/manufacturer/batches`, {
    headers: { Cookie: cookie },
  });
  const batchesHtml = await batchesPage.text();
  check("batches list shows Bags", batchesPage.ok && batchesHtml.includes("Bags"));

  const firstSimilar = await postBatch(cookie, {
    product_name: "Collision A",
    batch_code: `${TEST_BATCH_PREFIX}DEF-001`,
    plant_id: "PLANT-01",
    quantity: 1,
    product_category: "SHOES",
  });
  const secondSimilar = await postBatch(cookie, {
    product_name: "Collision B",
    batch_code: `${TEST_BATCH_PREFIX}DEF-002`,
    plant_id: "PLANT-01",
    quantity: 1,
    product_category: "SHOES",
  });
  const firstBody = (await firstSimilar.json()) as BatchResponse;
  const secondBody = (await secondSimilar.json()) as BatchResponse;
  check("similar batch codes both create", firstSimilar.status === 201 && secondSimilar.status === 201);
  check(
    "similar batch codes mint distinct product codes",
    firstBody.products?.[0]?.product_code !== secondBody.products?.[0]?.product_code,
    `${firstBody.products?.[0]?.product_code} vs ${secondBody.products?.[0]?.product_code}`,
  );
  check(
    "HARNESS-DEF-001 product code keeps the 001 suffix",
    firstBody.products?.[0]?.product_code === `VC-${slug("HARNESS-DEF-001")}-000001`,
    firstBody.products?.[0]?.product_code,
  );

  for (const category of PRODUCT_CATEGORIES) {
    const res = await postBatch(cookie, {
      product_name: `Sample ${category}`,
      batch_code: `${TEST_BATCH_PREFIX}CAT-${category}`,
      plant_id: "PLANT-01",
      quantity: 1,
      product_category: category,
    });
    const body = (await res.json()) as BatchResponse;
    check(
      `create ${category} batch`,
      res.status === 201 && body.batch?.product_category === category,
      body.error,
    );
    const page = await fetch(
      `${TEST_BASE}/product/${body.products?.[0]?.product_code}`,
    );
    const html = await page.text();
    check(
      `public page labels ${category} as ${productCategoryLabel(category)}`,
      page.ok && html.includes(productCategoryLabel(category)),
    );
  }

  const unlisted = await fetch(`${TEST_BASE}/api/batches`);
  check("GET /api/batches without login is 401", unlisted.status === 401);

  await deleteHarnessBatches(supabase);
  finish();
}

main().catch(async (error: unknown) => {
  try {
    await deleteHarnessBatches(serviceClient());
  } catch {
    // keep the original error
  }
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
