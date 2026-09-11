import { loadEnvFiles } from "./load-env";
import { graphUrl } from "../lib/graphql";
import { labeledGraphBatches } from "../lib/view";

async function main() {
  loadEnvFiles();

  const batches = await labeledGraphBatches(10);
  const labeled = batches.find((batch) => batch.batch_code);
  const batch = labeled ?? batches[0];

  if (!batch) {
    throw new Error("The Graph returned no batches. Is the subgraph synced?");
  }
  if (!batch.batch_code) {
    throw new Error(
      `Graph batch ${batch.id} has no matching batches.batch_code in Supabase`,
    );
  }
  if (batch.status !== "CREATED" && batch.status !== "MINTED") {
    throw new Error(`Unexpected batch status ${batch.status}`);
  }

  console.log("graph_url", graphUrl());
  console.log("batch_id_hash", batch.id);
  console.log("batch_code", batch.batch_code);
  console.log("quantity", batch.quantity);
  console.log("mintedCount", batch.mintedCount);
  console.log("status", batch.status);
  console.log("createdTx", batch.createdTx);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
