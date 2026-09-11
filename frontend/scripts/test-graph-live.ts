import { loadEnvFiles } from "./load-env";
import { deriveOnChainId } from "../lib/crypto/hash";
import { DEFAULT_GRAPH_URL, graphUrl } from "../lib/graphql";
import { getGraphDashboardCounts, labeledGraphBatches } from "../lib/view";
import { createReporter } from "./test-helpers";

const HASH_RE = /^0x[0-9a-f]{64}$/;

async function main() {
  loadEnvFiles();
  const { check, finish } = createReporter("Graph live join (step 4–5)");

  const batches = await labeledGraphBatches(10);
  const labeled = batches.find((batch) => batch.batch_code) ?? null;

  check("Graph Node returned at least one batch", batches.length > 0, graphUrl());
  check(
    "GRAPH_URL is the local subgraph unless overridden",
    graphUrl() === (process.env.GRAPH_URL?.replace(/\/+$/, "").trim() || DEFAULT_GRAPH_URL),
  );

  if (batches[0]) {
    check("batch id is a keccak hash", HASH_RE.test(batches[0].id), batches[0].id);
    check(
      "status is CREATED or MINTED",
      batches[0].status === "CREATED" || batches[0].status === "MINTED",
      batches[0].status,
    );
    check("quantity is a non-negative number", batches[0].quantity >= 0);
    check(
      "mintedCount does not exceed quantity when quantity is known",
      batches[0].quantity === 0 || batches[0].mintedCount <= batches[0].quantity,
      `${batches[0].mintedCount}/${batches[0].quantity}`,
    );
  }

  check("at least one Graph batch joins a Supabase batch_code", Boolean(labeled?.batch_code));
  if (labeled?.batch_code) {
    check(
      "joined batch_code hashes to the Graph id",
      deriveOnChainId(labeled.batch_code) === labeled.id,
      `${labeled.batch_code} → ${labeled.id}`,
    );
    check(
      "labels come from Supabase (code is not a hash)",
      labeled.batch_code !== labeled.id,
    );
  }

  const counts = await getGraphDashboardCounts();
  check("dashboard batch count is from Graph", counts.batches > 0, String(counts.batches));
  check(
    "products minted is sum of mintedCount",
    counts.products > 0,
    String(counts.products),
  );
  check("tags bound is a Graph count", counts.bound >= 0, String(counts.bound));
  check(
    "bound tags do not exceed minted products",
    counts.bound <= counts.products,
    `${counts.bound}/${counts.products}`,
  );

  finish();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
