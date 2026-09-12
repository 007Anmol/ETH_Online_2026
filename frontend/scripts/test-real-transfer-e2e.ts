/**
 * REAL end-to-end transfer test — no mocks, no simulation. Exercises the
 * exact same contract call the browser adapter constructs
 * (encodeFunctionData + transferFrom), signed by a real throwaway testnet
 * private key (standing in for a browser wallet, since no browser is
 * available in this environment), submitted to real Hedera testnet,
 * confirmed via a real receipt, then verified through the actual
 * preflight -> reconcile API routes against the actual dev server and
 * actual Supabase project.
 *
 * Requires: dev server running with ALLOW_TEST_AUTH=true.
 * Run with: npx tsx scripts/test-real-transfer-e2e.ts
 */
import consumerNftAbiJson from "@verichain/shared/abi/VeriChainConsumerNFT.json";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  http,
  type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createReporter, serviceClient, TEST_BASE } from "./test-helpers";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

const { check, finish } = createReporter("Real transfer end-to-end (live Hedera + real API)");

const NFT_ADDRESS = "0xF217e76F80a2743769B3f6D51bE1F1B6C2cC7b49" as const;
const PRODUCT_ID = "ea3f5027-524b-4ac8-94b4-59c1a27f5117"; // VC-SAACHI-000001, real seeded product
const PRODUCT_ID_HASH =
  "0xed817a6846fc050e090737335149b55f79d0ba71c58846f45e70b9adece9f194" as const;

const SELLER_PRIVATE_KEY =
  "0x850946e9c9e7ff3656c20d00be1768729167cd805904e81bf197ca644f86517a" as const;
const SELLER_ADDRESS = "0x5a8334871D6FCc868264A9338a11Ff15646d0B83" as const;
const RECIPIENT_ADDRESS = "0x21A6F7b419649Eaa75d554E266bF2354fC975544" as const; // throwaway "stranger" wallet

const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hashio.io/api"] } },
});

function extractCookie(res: Response): string {
  const cookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") ?? ""];
  const session = cookies.find((c) => c.trim().length > 0);
  if (!session) throw new Error("mock-login did not set a session cookie");
  return session.split(";")[0]!.trim();
}

async function main() {
  // 1. Real consumer session for the seller wallet (test-harness login —
  //    stands in for a real Privy + wallet-signature sign-in).
  const loginRes = await fetch(`${TEST_BASE}/api/auth/mock-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ as: "consumer", walletAddress: SELLER_ADDRESS }),
  });
  if (!loginRes.ok) {
    throw new Error(`mock-login failed (${loginRes.status}): ${await loginRes.text()}`);
  }
  const cookie = extractCookie(loginRes);
  check("consumer session established for the seller wallet", true);

  // 2. Real backend preflight — authorization is checked against real
  //    Supabase state (ownership_records), not trusted from the client.
  const idempotencyKey = crypto.randomUUID();
  const preflightRes = await fetch(`${TEST_BASE}/api/consumer/transfers/preflight`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      productId: PRODUCT_ID,
      toWalletAddress: RECIPIENT_ADDRESS,
      idempotencyKey,
    }),
  });
  const preflightBody = await preflightRes.json();
  check("real preflight succeeds", preflightRes.ok, JSON.stringify(preflightBody));
  check(
    "preflight returns the real on-chain productIdHash",
    preflightBody.productIdHash?.toLowerCase() === PRODUCT_ID_HASH,
  );
  check("preflight created a real ownership_transfers row", typeof preflightBody.transferId === "string");
  const transferId = preflightBody.transferId as string;

  const retryRes = await fetch(`${TEST_BASE}/api/consumer/transfers/preflight`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      productId: PRODUCT_ID,
      toWalletAddress: RECIPIENT_ADDRESS,
      idempotencyKey,
    }),
  });
  const retryBody = await retryRes.json();
  check(
    "retrying the same idempotencyKey returns the SAME transfer row, not a duplicate",
    retryBody.transferId === transferId,
  );

  // 3. Real wallet signature + real Hedera transaction — this is exactly
  //    the call frontend/lib/consumer/adapters/nft-transfer-adapter.ts
  //    constructs, signed here by a real private key standing in for a
  //    connected browser wallet.
  const account = privateKeyToAccount(SELLER_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: hederaTestnet,
    transport: http(hederaTestnet.rpcUrls.default.http[0]),
  });
  const publicClient = createPublicClient({
    chain: hederaTestnet,
    transport: http(hederaTestnet.rpcUrls.default.http[0]),
  });

  const data = encodeFunctionData({
    abi: consumerNftAbiJson as Abi,
    functionName: "transferFrom",
    args: [SELLER_ADDRESS, RECIPIENT_ADDRESS, PRODUCT_ID_HASH],
  });

  const txHash = await walletClient.sendTransaction({
    chain: hederaTestnet,
    account,
    to: NFT_ADDRESS,
    data,
    gas: 250_000n,
  });
  check("real tx hash returned immediately", /^0x[0-9a-fA-F]{64}$/.test(txHash), txHash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
  check("real Hedera receipt status is success", receipt.status === "success");

  // 4. Real reconciliation — verifies ownerOf on-chain, then updates the
  //    real ownership_records row.
  const reconcileRes = await fetch(`${TEST_BASE}/api/consumer/transfers/reconcile`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      transferId,
      productId: PRODUCT_ID,
      productIdHash: PRODUCT_ID_HASH,
      txHash,
      toWalletAddress: RECIPIENT_ADDRESS,
    }),
  });
  const reconcileBody = await reconcileRes.json();
  check("reconcile confirms on-chain ownership", reconcileBody.verified === true, JSON.stringify(reconcileBody));
  check("reconcile synced the real Supabase row", reconcileBody.synced === true, JSON.stringify(reconcileBody));

  // 5. Independent re-check of both sides of the world, not trusting the
  //    API's own success claim.
  const onChainOwner = await publicClient.readContract({
    address: NFT_ADDRESS,
    abi: consumerNftAbiJson as Abi,
    functionName: "ownerOf",
    args: [PRODUCT_ID_HASH],
  });
  check(
    "independent on-chain read confirms new owner",
    String(onChainOwner).toLowerCase() === RECIPIENT_ADDRESS.toLowerCase(),
    `got ${onChainOwner}`,
  );

  const supabase = serviceClient();
  const { data: transferRow } = await supabase
    .from("ownership_transfers")
    .select("status, sync_status, chain_tx_hash")
    .eq("id", transferId)
    .maybeSingle();
  check(
    "real ownership_transfers row reflects CONFIRMED/SYNCED",
    transferRow?.status === "CONFIRMED" && transferRow?.sync_status === "SYNCED",
    JSON.stringify(transferRow),
  );

  const { data: ownershipRow } = await supabase
    .from("ownership_records")
    .select("owner_wallet_address")
    .eq("product_id", PRODUCT_ID)
    .maybeSingle();
  check(
    "real ownership_records row now shows the recipient as owner",
    ownershipRow?.owner_wallet_address?.toLowerCase() === RECIPIENT_ADDRESS.toLowerCase(),
    JSON.stringify(ownershipRow),
  );

  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
