import {
  DEFAULT_GRAPH_URL,
  GraphQueryError,
  fetchGraphBatch,
  fetchGraphBatches,
  fetchGraphDashboardRows,
  fetchGraphEvents,
  graphQuery,
  graphUrl,
  type GraphBatch,
} from "../lib/graphql";
import {
  batchLabelsByHash,
  dashboardCountsFromGraph,
  graphBatchStatus,
  graphEventType,
  graphId,
  graphTagStatus,
  labelGraphBatch,
  productLabelsByHash,
  tagLabelsByHash,
} from "../lib/view";
import { createReporter } from "./test-helpers";

const { check, finish } = createReporter("Graph client / view (step 4)");

const HASH =
  "0x69bfdb73dde1d5f119ca13717e51b9707d46d1113f6d1cb70063fe2110329f7d";

function sampleBatch(overrides: Partial<GraphBatch> = {}): GraphBatch {
  return {
    id: HASH,
    quantity: "3",
    mintedCount: "3",
    status: "Minted",
    createdAt: "1789063300",
    createdTx: "0xabc",
    mintedAt: "1789063301",
    mintedTx: "0xdef",
    ...overrides,
  };
}

function throws(run: () => unknown, snippet?: string): boolean {
  try {
    run();
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return snippet ? message.includes(snippet) : true;
  }
}

async function throwsAsync(
  run: () => Promise<unknown>,
  snippet?: string,
): Promise<boolean> {
  try {
    await run();
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return snippet ? message.includes(snippet) : true;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const originalFetch = globalThis.fetch;
const originalGraphUrl = process.env.GRAPH_URL;
let fetchCalls = 0;
let fetchImpl: typeof fetch = async () => {
  throw new Error("fetch was not mocked");
};

async function withEnv<T>(value: string | undefined, run: () => T | Promise<T>): Promise<T> {
  if (value === undefined) delete process.env.GRAPH_URL;
  else process.env.GRAPH_URL = value;
  try {
    return await run();
  } finally {
    if (originalGraphUrl === undefined) delete process.env.GRAPH_URL;
    else process.env.GRAPH_URL = originalGraphUrl;
  }
}

async function main() {
  globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
    fetchCalls += 1;
    return fetchImpl(...args);
  }) as typeof fetch;

  try {
    await withEnv(undefined, () => {
      check(
        "GRAPH_URL defaults to local verichain subgraph",
        graphUrl() === DEFAULT_GRAPH_URL,
        graphUrl(),
      );
    });

    await withEnv("  http://example.local:8000/subgraphs/name/verichain///  ", () => {
      check(
        "GRAPH_URL is trimmed and has no trailing slash",
        graphUrl() === "http://example.local:8000/subgraphs/name/verichain",
        graphUrl(),
      );
    });

    check("Created maps to CREATED", graphBatchStatus("Created") === "CREATED");
    check("Minted maps to MINTED", graphBatchStatus("Minted") === "MINTED");
    check("canonical CREATED is kept", graphBatchStatus("CREATED") === "CREATED");
    check(
      "unknown batch status is rejected",
      throws(() => graphBatchStatus("Pending"), "Unknown Graph batch status"),
    );
    check(
      "empty batch status is rejected",
      throws(() => graphBatchStatus(""), "Unknown Graph batch status"),
    );

    check("Bound maps to BOUND", graphTagStatus("Bound") === "BOUND");
    check("Revoked maps to REVOKED", graphTagStatus("Revoked") === "REVOKED");
    check(
      "Unset is not invented as PROVISIONED",
      throws(() => graphTagStatus("Unset"), "Unknown Graph tag status"),
    );

    check(
      "BatchCreated maps to BATCH_CREATED",
      graphEventType("BatchCreated") === "BATCH_CREATED",
    );
    check(
      "BatchMinted maps to BATCH_MINTED",
      graphEventType("BatchMinted") === "BATCH_MINTED",
    );
    check("TagBound maps to TAG_BOUND", graphEventType("TagBound") === "TAG_BOUND");
    check(
      "TagRevoked maps to TAG_REVOKED",
      graphEventType("TagRevoked") === "TAG_REVOKED",
    );
    check(
      "NonceConsumed maps to NONCE_CONSUMED",
      graphEventType("NonceConsumed") === "NONCE_CONSUMED",
    );
    check(
      "Duplicate event type is not invented",
      throws(() => graphEventType("Duplicate"), "Unknown Graph event type"),
    );

    check(
      "graph ids are lowercased",
      graphId(HASH.toUpperCase()) === HASH,
    );

    const labeled = labelGraphBatch(sampleBatch({ id: HASH.toUpperCase() }), {
      batch_code: "JOINT-1",
      product_name: "Rado HyperChrome",
      plant_id: "MH-01",
      product_category: "WATCHES",
    });
    check("join keeps chain quantity from Graph", labeled.quantity === 3);
    check("join keeps mintedCount from Graph", labeled.mintedCount === 3);
    check("join maps Minted to MINTED", labeled.status === "MINTED");
    check("join attaches batch_code from DB", labeled.batch_code === "JOINT-1");
    check("join attaches plant from DB, not Graph", labeled.plant_id === "MH-01");
    check("join lowercases the graph id", labeled.id === HASH);

    const unlabeled = labelGraphBatch(sampleBatch(), undefined);
    check(
      "missing DB row leaves batch_code null (no invented label)",
      unlabeled.batch_code === null,
    );
    check(
      "missing DB row still keeps Graph counts",
      unlabeled.quantity === 3 && unlabeled.mintedCount === 3,
    );

    check(
      "invalid quantity is rejected",
      throws(() => labelGraphBatch(sampleBatch({ quantity: "nope" }), undefined), "quantity"),
    );
    check(
      "negative mintedCount is rejected",
      throws(
        () => labelGraphBatch(sampleBatch({ mintedCount: "-1" }), undefined),
        "mintedCount",
      ),
    );

    fetchCalls = 0;
    const emptyHashes = await Promise.all([
      batchLabelsByHash([]),
      productLabelsByHash(["", "  "]),
      tagLabelsByHash([]),
    ]);
    check("empty hash lists skip Supabase", emptyHashes.every((map) => map.size === 0));

    fetchCalls = 0;
    check(
      "fetchGraphBatches(0) does not hit The Graph",
      (await fetchGraphBatches(0)).length === 0 && fetchCalls === 0,
    );
    check(
      "fetchGraphEvents(0) does not hit The Graph",
      (await fetchGraphEvents(0)).length === 0 && fetchCalls === 0,
    );
    check(
      "fetchGraphBatch blank id does not hit The Graph",
      (await fetchGraphBatch("   ")) === null && fetchCalls === 0,
    );

    fetchImpl = async () => jsonResponse({ data: { batches: [sampleBatch()] } });
    fetchCalls = 0;
    const batches = await fetchGraphBatches(5);
    check("fetchGraphBatches returns Graph entities", batches.length === 1);
    check("fetchGraphBatches uses POST", fetchCalls === 1);

    fetchImpl = async () => {
      throw new TypeError("fetch failed");
    };
    check(
      "unreachable Graph is GraphQueryError, not a silent empty list",
      await throwsAsync(
        () => graphQuery("{ batches { id } }"),
        "The Graph is unreachable",
      ),
    );

    fetchImpl = async () => jsonResponse({ data: { ok: true } }, 502);
    check(
      "HTTP failure is GraphQueryError",
      await throwsAsync(() => graphQuery("{ batches { id } }"), "HTTP 502"),
    );

    fetchImpl = async () =>
      jsonResponse({ errors: [{ message: "indexing" }, { message: "bad field" }] });
    check(
      "GraphQL errors are not swallowed",
      await throwsAsync(() => graphQuery("{ batches { id } }"), "indexing; bad field"),
    );

    fetchImpl = async () => jsonResponse({});
    check(
      "empty Graph payload is GraphQueryError",
      await throwsAsync(() => graphQuery("{ batches { id } }"), "no data"),
    );

    fetchImpl = async () =>
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    check(
      "non-JSON body is GraphQueryError",
      await throwsAsync(() => graphQuery("{ batches { id } }"), "non-JSON"),
    );

    fetchImpl = async () => jsonResponse({ data: { ping: true } });
    const ping = await graphQuery<{ ping: boolean }>("{ ping }");
    check("successful Graph query returns data", ping.ping === true);

    check(
      "GraphQueryError is a named error",
      new GraphQueryError("x").name === "GraphQueryError",
    );

    const emptyCounts = dashboardCountsFromGraph([], 0);
    check("empty Graph dashboard is zeros, not seed rows", emptyCounts.batches === 0 && emptyCounts.products === 0 && emptyCounts.bound === 0);

    const summed = dashboardCountsFromGraph(
      [{ mintedCount: "3" }, { mintedCount: "2" }, { mintedCount: "0" }],
      4,
    );
    check("batches count is Graph batch rows", summed.batches === 3);
    check("products minted is sum(mintedCount), not a product table scan", summed.products === 5);
    check("tags bound is Bound-tag count", summed.bound === 4);
    check(
      "invalid mintedCount fails instead of falling back",
      throws(() => dashboardCountsFromGraph([{ mintedCount: "nope" }], 0), "mintedCount"),
    );

    fetchImpl = async () =>
      jsonResponse({
        data: {
          batches: [{ mintedCount: "3" }, { mintedCount: "1" }],
          boundTags: [{ id: "0x1" }],
        },
      });
    const rows = await fetchGraphDashboardRows();
    check("dashboard query reads Bound tags only", rows.boundTags.length === 1);
    check("dashboard query returns Graph mintedCount rows", rows.batches.length === 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalGraphUrl === undefined) delete process.env.GRAPH_URL;
    else process.env.GRAPH_URL = originalGraphUrl;
  }

  finish();
}

main().catch((error: unknown) => {
  globalThis.fetch = originalFetch;
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
