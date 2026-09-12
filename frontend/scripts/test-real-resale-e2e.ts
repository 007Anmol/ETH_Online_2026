/**
 * REAL end-to-end resale test — list, buy, verify, and (on a second fresh
 * product) cancel. Same rigor as test-real-transfer-e2e.ts: real Hedera
 * transactions signed by real throwaway testnet keys standing in for a
 * browser wallet, real API routes, real Supabase, independently re-verified
 * afterward.
 *
 * Requires: dev server running with ALLOW_TEST_AUTH=true.
 * Run with: npx tsx scripts/test-real-resale-e2e.ts
 */
import consumerNftAbiJson from "@verichain/shared/abi/VeriChainConsumerNFT.json";
import marketplaceAbiJson from "@verichain/shared/abi/VeriChainMarketplace.json";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  http,
  keccak256,
  parseEther,
  toBytes,
  type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createReporter, TEST_BASE } from "./test-helpers";
import { loadEnvFiles } from "./load-env";
import type { Database } from "../lib/database.types";

loadEnvFiles();
const { check, finish } = createReporter("Real resale end-to-end (live Hedera + real API)");

const NFT_ADDRESS = "0xF217e76F80a2743769B3f6D51bE1F1B6C2cC7b49" as const;
const MARKET_ADDRESS = "0xCC98075D05c02a7f136ff534bB01C5bE4476da4F" as const;

const SELLER_PRIVATE_KEY =
  "0x850946e9c9e7ff3656c20d00be1768729167cd805904e81bf197ca644f86517a" as const;
const SELLER_ADDRESS = "0x5a8334871D6FCc868264A9338a11Ff15646d0B83" as const;
const BUYER_PRIVATE_KEY =
  "0x291c8e5e7a60a9fa5a4c7c7c3252b5a3c6d0f3d3a3ced028e6e3aaedecb9efdb" as const;
const BUYER_ADDRESS = "0x1380FD4A3504997D50bfecD5796C2D715805CAcc" as const;

const OPERATOR_KEY = process.env.HEDERA_OPERATOR_PRIVATE_KEY as `0x${string}`;

const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hashio.io/api"] } },
});
const rpcUrl = hederaTestnet.rpcUrls.default.http[0];
const publicClient = createPublicClient({ chain: hederaTestnet, transport: http(rpcUrl) });

function walletFor(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return {
    account,
    client: createWalletClient({ account, chain: hederaTestnet, transport: http(rpcUrl) }),
  };
}

function extractCookie(res: Response): string {
  const cookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") ?? ""];
  const session = cookies.find((c) => c.trim().length > 0);
  if (!session) throw new Error("mock-login did not set a session cookie");
  return session.split(";")[0]!.trim();
}

async function loginAs(walletAddress: string): Promise<string> {
  const res = await fetch(`${TEST_BASE}/api/auth/mock-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ as: "consumer", walletAddress }),
  });
  if (!res.ok) throw new Error(`mock-login failed (${res.status}): ${await res.text()}`);
  return extractCookie(res);
}

async function seedProduct(supabase: SupabaseClient<Database>, code: string, owner: string) {
  const { data: batch } = await supabase
    .from("batches")
    .select("id, manufacturer_org_id")
    .eq("batch_code", "SAACHI-DEV-001")
    .maybeSingle();
  if (!batch) throw new Error("seed batch not found");

  const productIdHash = keccak256(toBytes(code));
  const { data: product } = await supabase
    .from("products")
    .upsert(
      {
        product_code: code,
        product_id_hash: productIdHash,
        batch_id: batch.id,
        serial_number: `SN-${code}`,
        manufacturer_org_id: batch.manufacturer_org_id,
        status: "TAG_BOUND",
      },
      { onConflict: "product_code" },
    )
    .select("id, product_id_hash")
    .single();
  if (!product) throw new Error("could not seed product");

  const operatorWallet = walletFor(OPERATOR_KEY);
  const mintData = encodeFunctionData({
    abi: consumerNftAbiJson as Abi,
    functionName: "mint",
    args: [product.product_id_hash, owner],
  });
  const mintTx = await operatorWallet.client.sendTransaction({
    chain: hederaTestnet,
    account: operatorWallet.account,
    to: NFT_ADDRESS,
    data: mintData,
    gas: 250_000n,
  });
  await publicClient.waitForTransactionReceipt({ hash: mintTx, timeout: 60_000 });

  await supabase.from("ownership_records").insert({
    product_id: product.id,
    owner_wallet_address: owner.toLowerCase(),
    chain_tx_hash: mintTx,
  });

  return { id: product.id as string, productIdHash: product.product_id_hash as `0x${string}` };
}

async function main() {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // ===== Scenario A: list -> buy =====
  const productA = await seedProduct(supabase, `VC-RESALE-BUY-${Date.now()}`, SELLER_ADDRESS);
  check("scenario A: fresh product minted to seller", true);

  const sellerCookie = await loginAs(SELLER_ADDRESS);
  const seller = walletFor(SELLER_PRIVATE_KEY);

  // Approve marketplace once.
  const approveData = encodeFunctionData({
    abi: consumerNftAbiJson as Abi,
    functionName: "setApprovalForAll",
    args: [MARKET_ADDRESS, true],
  });
  const approveTx = await seller.client.sendTransaction({
    chain: hederaTestnet,
    account: seller.account,
    to: NFT_ADDRESS,
    data: approveData,
    gas: 250_000n,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx, timeout: 60_000 });
  check("real setApprovalForAll confirmed", true, approveTx);

  const listPreflightRes = await fetch(`${TEST_BASE}/api/consumer/marketplace/listings/preflight`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sellerCookie },
    body: JSON.stringify({ productId: productA.id, priceHbar: 1.5 }),
  });
  const listPreflightBody = await listPreflightRes.json();
  check("real listing preflight succeeds", listPreflightRes.ok, JSON.stringify(listPreflightBody));

  const priceTinybars = parseEther("1.5") / 10n ** 10n; // 1.5 HBAR in tinybar units
  const createListingData = encodeFunctionData({
    abi: marketplaceAbiJson as Abi,
    functionName: "createListing",
    args: [productA.productIdHash, priceTinybars],
  });
  const listTx = await seller.client.sendTransaction({
    chain: hederaTestnet,
    account: seller.account,
    to: MARKET_ADDRESS,
    data: createListingData,
    gas: 300_000n,
  });
  await publicClient.waitForTransactionReceipt({ hash: listTx, timeout: 60_000 });
  check("real createListing tx confirmed", true, listTx);

  const listReconcileRes = await fetch(`${TEST_BASE}/api/consumer/marketplace/listings/reconcile`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sellerCookie },
    body: JSON.stringify({ productId: productA.id, productIdHash: productA.productIdHash, txHash: listTx }),
  });
  const listReconcileBody = await listReconcileRes.json();
  check(
    "real listing reconcile verifies Active on-chain and syncs Supabase",
    listReconcileBody.verified === true && listReconcileBody.synced === true,
    JSON.stringify(listReconcileBody),
  );

  const buyerCookie = await loginAs(BUYER_ADDRESS);
  const buyer = walletFor(BUYER_PRIVATE_KEY);

  const purchasePreflightRes = await fetch(`${TEST_BASE}/api/consumer/marketplace/purchase/preflight`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: buyerCookie },
    body: JSON.stringify({ productId: productA.id }),
  });
  const purchasePreflightBody = await purchasePreflightRes.json();
  check(
    "real purchase preflight returns the on-chain price, not a client-supplied one",
    purchasePreflightBody.priceTinybars === priceTinybars.toString(),
    JSON.stringify(purchasePreflightBody),
  );

  const buyData = encodeFunctionData({
    abi: marketplaceAbiJson as Abi,
    functionName: "buy",
    args: [productA.productIdHash],
  });
  const buyTx = await buyer.client.sendTransaction({
    chain: hederaTestnet,
    account: buyer.account,
    to: MARKET_ADDRESS,
    data: buyData,
    value: parseEther("1.5"), // 18-decimal tx value; contract sees 1.5 HBAR in tinybars
    gas: 500_000n,
  });
  const buyReceipt = await publicClient.waitForTransactionReceipt({ hash: buyTx, timeout: 60_000 });
  check("real buy() transaction succeeded on Hedera", buyReceipt.status === "success", buyTx);

  const purchaseReconcileRes = await fetch(`${TEST_BASE}/api/consumer/marketplace/purchase/reconcile`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: buyerCookie },
    body: JSON.stringify({ productId: productA.id, productIdHash: productA.productIdHash, txHash: buyTx }),
  });
  const purchaseReconcileBody = await purchaseReconcileRes.json();
  check(
    "real settlement reconcile verifies ownership AND sale status on-chain",
    purchaseReconcileBody.verified === true && purchaseReconcileBody.synced === true,
    JSON.stringify(purchaseReconcileBody),
  );

  const onChainOwner = await publicClient.readContract({
    address: NFT_ADDRESS,
    abi: consumerNftAbiJson as Abi,
    functionName: "ownerOf",
    args: [productA.productIdHash],
  });
  check(
    "independent on-chain read confirms buyer now owns the NFT",
    String(onChainOwner).toLowerCase() === BUYER_ADDRESS.toLowerCase(),
  );

  const { data: settlementRow } = await supabase
    .from("resale_settlements")
    .select("status, sync_status, amount_tinybar")
    .eq("product_id", productA.id)
    .maybeSingle();
  check(
    "real resale_settlements row is COMPLETED/SYNCED with the correct amount",
    settlementRow?.status === "COMPLETED" &&
      settlementRow?.sync_status === "SYNCED" &&
      Number(settlementRow?.amount_tinybar) === Number(priceTinybars),
    JSON.stringify(settlementRow),
  );

  const { data: ownershipRow } = await supabase
    .from("ownership_records")
    .select("owner_wallet_address")
    .eq("product_id", productA.id)
    .maybeSingle();
  check(
    "real ownership_records row now shows the buyer as owner",
    ownershipRow?.owner_wallet_address?.toLowerCase() === BUYER_ADDRESS.toLowerCase(),
  );

  // ===== Scenario B: list -> cancel =====
  const productB = await seedProduct(supabase, `VC-RESALE-CANCEL-${Date.now()}`, SELLER_ADDRESS);

  const listBData = encodeFunctionData({
    abi: marketplaceAbiJson as Abi,
    functionName: "createListing",
    args: [productB.productIdHash, priceTinybars],
  });
  const listBTx = await seller.client.sendTransaction({
    chain: hederaTestnet,
    account: seller.account,
    to: MARKET_ADDRESS,
    data: listBData,
    gas: 300_000n,
  });
  await publicClient.waitForTransactionReceipt({ hash: listBTx, timeout: 60_000 });
  await fetch(`${TEST_BASE}/api/consumer/marketplace/listings/reconcile`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sellerCookie },
    body: JSON.stringify({ productId: productB.id, productIdHash: productB.productIdHash, txHash: listBTx }),
  });

  const cancelData = encodeFunctionData({
    abi: marketplaceAbiJson as Abi,
    functionName: "cancelListing",
    args: [productB.productIdHash],
  });
  const cancelTx = await seller.client.sendTransaction({
    chain: hederaTestnet,
    account: seller.account,
    to: MARKET_ADDRESS,
    data: cancelData,
    gas: 300_000n,
  });
  await publicClient.waitForTransactionReceipt({ hash: cancelTx, timeout: 60_000 });
  check("real cancelListing tx confirmed", true, cancelTx);

  const cancelReconcileRes = await fetch(`${TEST_BASE}/api/consumer/marketplace/listings/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sellerCookie },
    body: JSON.stringify({ productId: productB.id, productIdHash: productB.productIdHash, txHash: cancelTx }),
  });
  const cancelReconcileBody = await cancelReconcileRes.json();
  check(
    "real cancel reconcile verifies Cancelled on-chain and syncs Supabase",
    cancelReconcileBody.verified === true && cancelReconcileBody.synced === true,
    JSON.stringify(cancelReconcileBody),
  );

  const { data: cancelledListing } = await supabase
    .from("resale_listings")
    .select("status")
    .eq("product_id", productB.id)
    .maybeSingle();
  check("real resale_listings row shows CANCELLED", cancelledListing?.status === "CANCELLED");

  // A buyer attempting to buy the now-cancelled listing must be rejected.
  const rejectedPurchaseRes = await fetch(`${TEST_BASE}/api/consumer/marketplace/purchase/preflight`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: buyerCookie },
    body: JSON.stringify({ productId: productB.id }),
  });
  check(
    "purchase preflight rejects a cancelled listing",
    !rejectedPurchaseRes.ok,
    `status ${rejectedPurchaseRes.status}`,
  );

  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
