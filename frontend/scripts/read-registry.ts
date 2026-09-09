import { loadEnvFiles } from "./load-env";

async function ethCall(rpcUrl: string, address: string, data: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: address, data }, "latest"],
    }),
  });
  const body = (await response.json()) as {
    result?: string;
    error?: { message: string };
  };
  if (body.error) {
    throw new Error(body.error.message);
  }
  if (!body.result || body.result === "0x") {
    throw new Error(
      "eth_call returned empty data. Is HEDERA_REGISTRY_ADDRESS a deployed contract?",
    );
  }
  return body.result;
}

function decodeAddress(word: string): string {
  return `0x${word.slice(-40)}`;
}

async function readRegistry() {
  loadEnvFiles();

  const rpcUrl = process.env.HEDERA_TESTNET_RPC_URL?.trim();
  const chainId = process.env.HEDERA_TESTNET_CHAIN_ID?.trim();
  const address = process.env.HEDERA_REGISTRY_ADDRESS?.trim();
  const expectedOwner = process.env.HEDERA_OPERATOR_ADDRESS?.trim()?.toLowerCase();
  const hashscan = process.env.HEDERA_REGISTRY_HASHSCAN_URL?.trim();

  if (!rpcUrl || !address) {
    throw new Error(
      "Set HEDERA_TESTNET_RPC_URL and HEDERA_REGISTRY_ADDRESS before reading the live contract.",
    );
  }

  const ownerWord = await ethCall(rpcUrl, address, "0x8da5cb5b");
  const owner = decodeAddress(ownerWord);
  const zeroBatch = await ethCall(
    rpcUrl,
    address,
    `0xed42136f${"00".repeat(32)}`,
  );
  const exists = BigInt(`0x${zeroBatch.slice(2, 66)}`) === 1n;

  console.log("rpc", rpcUrl);
  console.log("chainId", chainId);
  console.log("registry", address);
  if (hashscan) console.log("hashscan", hashscan);
  console.log("owner", owner);
  console.log("getBatch(0) exists", exists);

  if (expectedOwner && owner !== expectedOwner) {
    throw new Error(
      `owner ${owner} does not match HEDERA_OPERATOR_ADDRESS ${expectedOwner}`,
    );
  }
  if (exists) {
    throw new Error("unset batch id should not exist on a fresh registry");
  }

  console.log("live read ok");
}

readRegistry().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
