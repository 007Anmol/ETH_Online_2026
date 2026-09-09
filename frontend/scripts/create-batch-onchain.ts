import { createBatchOnChain } from "@verichain/hedera";
import { HEDERA_REGISTRY_HASHSCAN_URL } from "@verichain/shared";
import { deriveOnChainId } from "../lib/crypto/hash";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

async function ethCall(rpcUrl: string, to: string, data: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const body = (await response.json()) as {
    result?: string;
    error?: { message: string };
  };
  if (body.error) throw new Error(body.error.message);
  return body.result ?? "0x";
}

async function main() {
  const rpcUrl =
    process.env.HEDERA_TESTNET_RPC_URL?.trim() ||
    "https://testnet.hashio.io/api";
  const registry = process.env.HEDERA_REGISTRY_ADDRESS?.trim();
  if (!registry) {
    throw new Error("Set HEDERA_REGISTRY_ADDRESS in .env.local");
  }

  const batchCode = `SCRIPT-${Date.now()}`;
  const batchIdHash = deriveOnChainId(batchCode);
  const quantity = 1;

  console.log("batch_code", batchCode);
  console.log("batch_id_hash", batchIdHash);

  const { txHash } = await createBatchOnChain({ batchIdHash, quantity });
  const txUrl = `https://hashscan.io/testnet/transaction/${txHash}`;

  const selector = "0xed42136f"; // getBatch(bytes32)
  const result = await ethCall(rpcUrl, registry, `${selector}${batchIdHash.slice(2)}`);
  const exists = BigInt(`0x${result.slice(2, 66)}`) === 1n;
  const onChainQty = Number(BigInt(`0x${result.slice(66, 130)}`));

  console.log("txHash", txHash);
  console.log("hashscan_tx", txUrl);
  console.log("hashscan_contract", HEDERA_REGISTRY_HASHSCAN_URL);
  console.log("getBatch exists", exists);
  console.log("getBatch quantity", onChainQty);

  if (!exists || onChainQty !== quantity) {
    throw new Error("createBatch mined but getBatch did not return the new batch");
  }

  console.log("create-batch on testnet ok");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
