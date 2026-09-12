/**
 * Verifies the shared `@verichain/hedera` consumer utilities — the unit
 * conversion helpers (`hbarToTinybars`/`hbarToTransactionValue`) and the
 * live-read functions — against the REAL deployed contracts on Hedera
 * testnet. This is the TypeScript-level counterpart to the manual `cast`
 * verification recorded in CONSUMER_BACKEND_PLAN.md: it proves the actual
 * code future adapters will import (not just raw RPC calls) talks to the
 * live chain correctly, including reading back state produced by that
 * earlier manual pass (known product ids from that session).
 *
 * Run with: npx tsx scripts/test-consumer-chain-utils.ts
 * (no dev server required — this talks to Hedera directly, not to the app)
 */
import { keccak256, toBytes } from "viem";
import {
  getConsumerNftOwner,
  getOnChainListing,
  hbarToTinybars,
  hbarToTransactionValue,
  mintConsumerNftOnChain,
  tinybarsToHbarString,
} from "@verichain/hedera";
import { loadEnvFiles } from "./load-env";
import { createReporter } from "./test-helpers";

loadEnvFiles();

const { check, finish } = createReporter("Consumer chain utils (live Hedera)");

// Product ids minted/listed during this session's manual verification pass
// (see CONSUMER_BACKEND_PLAN.md's deployment record) — reading them back
// here proves this module's live-read path agrees with that ground truth.
const PRODUCT_TWO_WALLET_TEST = keccak256(toBytes("VC-TWO-WALLET-TEST-0002-UNIT-CHECK"));
const PRODUCT_DOUBLE_BUY_TEST = keccak256(toBytes("VC-DOUBLEBUY-TEST-0003"));
const PRODUCT_BLOCKED_TEST = keccak256(toBytes("VC-BLOCKED-TEST-0004"));

const BUYER1_ADDRESS = "0x1380FD4A3504997D50bfecD5796C2D715805CAcc".toLowerCase();
const SELLER_ADDRESS = "0x5a8334871D6FCc868264A9338a11Ff15646d0B83".toLowerCase();

async function main() {
  // --- Pure unit-conversion math: no network needed for these ---
  check("2 HBAR -> 200,000,000 tinybars", hbarToTinybars("2") === 200_000_000n);
  check("0.00000001 HBAR -> 1 tinybar (smallest unit round-trips)", hbarToTinybars("0.00000001") === 1n);
  check(
    "hbarToTransactionValue(2) == parseEther(2) == 2e18 (the tx-level value, NOT the contract-level tinybar figure)",
    hbarToTransactionValue("2") === 2_000_000_000_000_000_000n,
  );
  check(
    "tinybarsToHbarString round-trips a whole HBAR amount",
    tinybarsToHbarString(200_000_000n) === "2",
  );
  check(
    "tinybarsToHbarString round-trips a fractional HBAR amount",
    tinybarsToHbarString(150_000_000n) === "1.5",
  );

  // --- Live reads against the real deployed contracts ---
  const owner = await getConsumerNftOwner(PRODUCT_TWO_WALLET_TEST);
  check(
    "live ownerOf() agrees with the manual cast-verified buyer from this session",
    owner?.toLowerCase() === BUYER1_ADDRESS,
    `got ${owner}`,
  );

  const doubleBuyListing = await getOnChainListing(PRODUCT_DOUBLE_BUY_TEST);
  check(
    "live getListing() shows the double-buy-race listing as Sold",
    doubleBuyListing.status === "Sold",
    `got ${doubleBuyListing.status}`,
  );
  check(
    "live getListing() seller matches the known seller address",
    doubleBuyListing.seller.toLowerCase() === SELLER_ADDRESS,
  );

  const blockedListing = await getOnChainListing(PRODUCT_BLOCKED_TEST);
  check(
    "live getListing() shows the blocked-product listing as still Active (buy was rejected, not silently marked Sold)",
    blockedListing.status === "Active",
    `got ${blockedListing.status}`,
  );

  // --- Live write through this exact module (not just reads) ---
  const operatorAddress = process.env.HEDERA_OPERATOR_ADDRESS?.trim();
  if (operatorAddress) {
    const freshProductId = keccak256(toBytes(`VC-CHAIN-UTILS-WRITE-TEST-${Date.now()}`));
    const { txHash } = await mintConsumerNftOnChain({
      productIdHash: freshProductId,
      initialOwner: operatorAddress as `0x${string}`,
    });
    check("mintConsumerNftOnChain returns a real tx hash", /^0x[0-9a-fA-F]{64}$/.test(txHash));

    const mintedOwner = await getConsumerNftOwner(freshProductId);
    check(
      "freshly minted product's live ownerOf() matches the operator address",
      mintedOwner?.toLowerCase() === operatorAddress.toLowerCase(),
      `got ${mintedOwner}, tx ${txHash}`,
    );
  } else {
    check("skipped live mint write test (HEDERA_OPERATOR_ADDRESS not set)", true);
  }

  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
