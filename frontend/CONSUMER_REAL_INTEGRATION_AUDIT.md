# Consumer Real Hedera Integration — Final Audit

Status as of 2026-09-12. Companion to `frontend/CONSUMER_BACKEND_PLAN.md` (the
running plan/decision log) — this document is the point-in-time verification
report: what is real, what is verified, what is not.

## A. Executive summary

Direct NFT transfer and consumer-to-consumer resale (list/buy/cancel) are
**genuinely real, end-to-end, and verified live on Hedera testnet**: a real
browser-wallet-style signature submits a real transaction to the real
deployed contracts, the backend independently re-reads on-chain state before
writing anything to Supabase, and every claim below was re-checked by an
independent read afterward, not just trusted from an API's own response.
Grievance is a real, Supabase-backed backend API (no blockchain involved, by
design). What is **not** done: wiring Resale/Grievance into browser UI pages
(Transfer has one; the others are API+adapter only), and any actual
click-through browser testing (no browser tool exists in this environment —
every "wallet signature" below was a real private key standing in for one).

## B. Architecture

```
Consumer UI (Transfer only so far)
        |
        v
Consumer API (app/api/consumer/**) — auth + preflight, Supabase-backed
        |
        v
Adapter (lib/consumer/adapters/*) — client-side, wraps the connected wallet
        |
        v
User wallet (Privy-connected EIP-1193 provider via viem)
        |
        v
Hedera Testnet — VeriChainConsumerNFT / VeriChainMarketplace
        |
   -----+----------------------------
   |                                |
   v                                v
On-chain state (ownerOf,      Transaction receipt
 getListing)                        |
   |                                v
   +----------> Backend reconciliation (independent on-chain read,
                 never trusts the client's claim)
                        |
                        v
                    Supabase (ownership_records, ownership_transfers,
                    resale_listings, resale_settlements, grievances)
```

Supabase never blocks the user from seeing on-chain confirmation — a
Supabase write failure after a verified on-chain event reports
`verified: true, synced: false`, not a failure (see `D`/`E`).

## C. Contracts

| Contract | Address | Network | Status |
|---|---|---|---|
| `VeriChainConsumerNFT` | `0xF217e76F80a2743769B3f6D51bE1F1B6C2cC7b49` | Hedera testnet, chain id 296 | Deployed, live-verified |
| `VeriChainMarketplace` | `0xCC98075D05c02a7f136ff534bB01C5bE4476da4F` | Hedera testnet, chain id 296 | Deployed, live-verified |

Key functions used: `mint`, `ownerOf`, `transferFrom`, `setApprovalForAll`
(NFT); `createListing`, `cancelListing`, `buy`, `getListing`,
`setProductBlocked` (Marketplace). Key events: `Transfer`, `ListingCreated`,
`ListingCancelled`, `EscrowFunded`, `NFTTransferred`, `EscrowReleased`,
`SaleCompleted`.

## D. Ownership (direct transfer) flow

```
Consumer A (owner)
  -> backend preflight (real ownership check + idempotent operation record)
  -> real wallet signature (Privy wallet's own EIP-1193 provider via viem)
  -> VeriChainConsumerNFT.transferFrom() submitted to Hedera
  -> real tx hash shown immediately (UI does not wait for Supabase)
  -> frontend watches the real receipt (lib/consumer/chain/watch-transaction.ts)
  -> backend reconcile: independently reads ownerOf(productIdHash)
  -> ownership_records + ownership_transfers updated
  -> CONFIRMED (or CONFIRMED + SYNC_FAILED if the Supabase write itself failed
     — never shown to the user as a failed transfer)
```

## E. Resale flow

Consumer-to-consumer escrow is implemented **inside `VeriChainMarketplace`**
(atomic buy() — funding, NFT transfer, and payout crediting all happen in one
transaction, with a pull-payment `withdraw()` for final settlement) and is
**entirely separate** from the existing team2 B2B `escrows` table, which is
organization-scoped and untouched by this feature.

```
SELLER: approve marketplace -> createListing -> backend verifies Active
        on-chain -> resale_listings row created (status INITIATED)
BUYER:  purchase preflight reads price/seller from the ON-CHAIN listing
        (never client-supplied) -> real buy() with correct tinybar-scaled
        value -> backend verifies BOTH ownerOf(buyer) AND on-chain listing
        status == Sold -> resale_settlements (COMPLETED) + ownership_records
        updated + resale_listings -> OWNERSHIP_TRANSFERRED
CANCEL: seller-only cancelListing -> backend verifies Cancelled on-chain
        before updating the index
```

## F. Product identity — explicit, unresolved ambiguity (not invented)

- `products.product_id_hash` (`keccak256(product_code)`) is the identity
  VeriChainConsumerNFT uses directly as its token id — same scheme as the
  existing `VeriChainRegistry`. No separate mapping to keep in sync.
- `products.token_id` (bigint, "digital twin ID, null until minted") is a
  **separate, currently-unpopulated column whose intent this audit does not
  know** — nothing in this repo populates it, and this feature does not
  either. Flagged for whoever owns that column's intent to resolve, not
  guessed at.

## G. Database

**Modified** (filled in two pre-existing stub types that silently blocked any
typed write): `ownership_records`, `resale_listings` — `Insert`/`Update` were
literally `Record<string, never>` in `packages/shared/types/database.types.ts`.

**Created** (migration `0010_consumer_transfer_resale_grievance.sql`, applied
to the real project by the user via the Supabase SQL editor):
`ownership_transfers`, `resale_settlements`, `grievances`,
`grievance_events`, plus new `product_event_type` enum values. No FK from
`resale_settlements` to the existing `escrows` table — that table is a
distinct B2B concept (see `CONSUMER_BACKEND_PLAN.md`'s compatibility audit).

## H. API

| Method & path | Auth | Purpose | Idempotent |
|---|---|---|---|
| `POST /api/consumer/auth/wallet-challenge` | Privy token | Issue signable challenge | — |
| `POST /api/consumer/auth/complete` | Privy token + signature | Verify + establish session (auto-provisions CONSUMER profile) | — |
| `POST /api/consumer/transfers/preflight` | consumer session | Validate ownership, create operation record | Yes (`idempotencyKey`) |
| `POST /api/consumer/transfers/reconcile` | consumer session | Verify on-chain, update ownership | N/A (idempotent by re-verification) |
| `POST /api/consumer/marketplace/listings/preflight` | consumer session | Validate seller ownership + no active listing | — |
| `POST /api/consumer/marketplace/listings/reconcile` | consumer session | Verify Active on-chain, create index row | — |
| `POST /api/consumer/marketplace/listings/cancel` | consumer session | Verify Cancelled on-chain, update index | — |
| `POST /api/consumer/marketplace/purchase/preflight` | consumer session | Read on-chain price/seller, validate buyer | — |
| `POST /api/consumer/marketplace/purchase/reconcile` | consumer session | Verify ownership + sale status, settle | — |
| `POST /api/consumer/grievances` | consumer session | Create grievance (status forced to OPEN) | — |
| `GET /api/consumer/grievances` | consumer session | List own grievances only | — |
| `GET /api/consumer/grievances/:id` | consumer session | Read own grievance + event timeline (404 if not owner) | — |

No route trusts a client-supplied owner/seller/buyer/price — every one is
re-derived from the session and/or on-chain state.

## I. Adapters

`lib/consumer/adapters/nft-transfer-adapter.ts` — signs/submits real
`transferFrom`. `lib/consumer/adapters/marketplace-adapter.ts` —
signs/submits real `setApprovalForAll`/`createListing`/`cancelListing`/`buy`.
Both use `lib/consumer/chain/hedera-wallet-client.ts` (wraps the connected
Privy wallet's own EIP-1193 provider — the backend never holds a user key)
with explicit gas limits (Hedera's `eth_estimateGas` confirmed
under-provisioning by live testing).

## J. Transaction state machine

Transfer: `IDLE → VALIDATING → AWAITING_SIGNATURE → SUBMITTED →
CONFIRMING_ON_HEDERA → VERIFYING_OWNERSHIP → CONFIRMED`, with
`SIGNATURE_REJECTED / TRANSACTION_REVERTED / TRANSACTION_FAILED /
OWNERSHIP_VERIFICATION_FAILED / WRONG_NETWORK` failure states — every
transition driven by a real wallet event, Hedera receipt, or on-chain read,
never a timer (`lib/consumer/hooks/use-nft-transfer.ts`,
`lib/consumer/types.ts`).

## K. Real-time architecture

Supabase writes happen strictly *after* on-chain verification and never gate
the `CONFIRMED` state shown to the user. A failed Supabase write after a
verified on-chain event returns `synced: false` alongside `verified: true` —
the UI is designed to show "confirmed on Hedera, still syncing," not a
failure (`TransferPanel.tsx`'s `SYNC_FAILED` branch).

## L. Hedera-specific handling

Two non-obvious findings from live testing, now centralized:

1. **`msg.value` is tinybar-scaled (8 decimals) inside the contract**, not
   the 18-decimal figure a transaction's `value` field carries — a listing
   `price` must be tinybars; the transaction `value` a wallet sends stays
   the normal `parseEther(hbar)` figure. Centralized in
   `services/hedera/src/consumer.ts` (server) and
   `lib/consumer/chain/hbar-units.ts` (client, duplicated because the server
   module is `server-only`-guarded).
2. **`eth_estimateGas` under-provisions gas** for both contracts — every
   write here uses an explicit gas limit, never estimation.

## M. Logging

Structured JSON console logs at every major transition, each carrying
`event`, `source` (`frontend | backend | blockchain`), and relevant IDs —
e.g. `ownership.transfer.preflight.validated`, `ownership.transfer.submitted`,
`ownership.transfer.receipt.confirmed`, `ownership.transfer.ownership.verified`,
`ownership.transfer.backend.persisted` / `.sync_failed`; the `marketplace.*`
and `grievance.*` equivalents in the corresponding routes. No private keys,
session tokens, or service-role keys are ever logged.

## N. Failure/recovery

| Case | Behavior |
|---|---|
| Wallet rejects signature | `SignatureRejectedError` → `SIGNATURE_REJECTED` state, no tx, no backend record marked confirmed |
| Wrong network | `WrongNetworkError` before any signature is requested |
| Transaction reverted on-chain | Receipt status checked explicitly; reconcile never called with a false claim |
| Supabase write fails after on-chain confirm | `verified: true, synced: false` — not reported as a failed transfer/sale |
| Attempted transfer by a wallet that no longer owns the item | Preflight rejects with 403; a raw on-chain attempt correctly reverts (observed directly during this audit's own regression run) |
| Purchase of a cancelled/inactive listing | Preflight rejects with 409 (verified in the resale E2E test) |
| Duplicate `idempotencyKey` on transfer preflight | Returns the same operation record, not a duplicate (verified) |

## O. Security review

- Every route calls `requireConsumer()` (mirrors `requireManufacturer()`) —
  session re-verified against the real `profiles` row, not trusted from a
  cookie's claimed identity alone.
- No route accepts `sellerId`/`buyerId`/`ownerId`/price from the client body
  as authoritative — always re-derived from session + on-chain reads.
- Consumer wallet sign-in reuses the manufacturer flow's Privy-token +
  signed-challenge verification (`recoverMessageAddress`), not a weaker
  mechanism — minus World ID, which is a manufacturer-only policy.
- Double-buy is prevented at the **contract level**
  (checks-effects-interactions in `buy()`), not solely by a Supabase unique
  index — verified live in this session's earlier contract testing.
- Grievance reads are scoped to `consumer_profile_id = session.profileId`
  and return 404 (not 403) cross-consumer, avoiding existence leakage.
- No private key, service-role key, or session token appears in any log
  line added by this work.

## P. Test results

| Suite | Command | Result |
|---|---|---|
| Solidity contracts | `forge test` (in `contracts/`) | **PASS — 43/43** (local, live) |
| Shared chain utilities | `npm run test:consumer-chain-utils` | **PASS — 11/11**, includes 3 live reads + 1 live write against deployed contracts |
| Direct transfer, full stack | `npx tsx scripts/test-real-transfer-e2e.ts` | **PASS — 12/12** on first run (real wallet sig, real Hedera tx, real API, real Supabase, independently re-verified). Re-running against the same fixture correctly fails preflight/on-chain (single-use fixture, not a regression — see `N`). |
| C2C resale, full stack | `npx tsx scripts/test-real-resale-e2e.ts` | **PASS — 16/16** (list, buy, settle, cancel, rejected-purchase-of-cancelled-listing) |
| Grievance API | `npx tsx scripts/test-real-grievances-e2e.ts` | **PASS — 9/9** (validation, creation, isolation, unauthenticated rejection) |
| Route regression | manual curl sweep | **PASS** — all pre-existing consumer/manufacturer routes + the new transfer page return 200 |

Distinguishing evidence tiers, per the honesty rule this audit follows:

- **PASS — live Hedera**: all transaction-producing checks above (contract
  tests already run against live testnet in an earlier session; transfer,
  resale scripts submit real transactions this session).
- **PASS — local automated**: TypeScript compiles clean (`npx tsc --noEmit`)
  after every change in this pass.
- **PASS — backend automated**: grievance suite (no chain involved).
- **NOT VERIFIED — browser/manual QA**: no browser tool exists in this
  environment. Every "wallet signature" in the test suites above was signed
  by a real private key standing in for a connected browser wallet, not
  clicked through an actual Privy connect-wallet UI. Responsive QA
  (320–1440px+), keyboard navigation, and reduced-motion behavior for the
  Transfer page are **not verified** for the same reason.

## Q. Live Hedera evidence (representative — full set in `CONSUMER_BACKEND_PLAN.md`)

| Test | Tx hash | Result |
|---|---|---|
| Real transfer (first run) | `0x326741de0c6a0ae151edbb113314b2d540c2529386591b2122db56581e5500d7` | Success |
| Real resale purchase | `0xc6aed0a5dd197227e963a8e34a01bc43cd5cf04438801b652be9bad2c0efcf88` | Success |
| Real listing cancellation | see `test-real-resale-e2e.ts` output this session | Success |
| Double-buy race (earlier session) | winner `0x51c8dbd9…`, loser `0x7bccaf98…` (reverted) | Contract-level protection confirmed |

Full addresses/hashes are public transaction data, not secrets — reproducible
via HashScan (`https://hashscan.io/testnet/transaction/<hash>`).

## R. Manual QA

**NOT PERFORMED.** No browser automation tool is available in this
environment. Do not treat the scripted wallet-signing tests above as browser
QA — they prove the contract/API/adapter logic is correct, not that a human
can actually click through the Privy connect-wallet flow, see the states
render, or that the page behaves correctly at any responsive breakpoint.

## S. Known limitations

- Resale and Grievance have no UI page yet (Transfer does:
  `/consumer/hedera-transfer/[productId]`) — API + adapter layer only.
- Consumer wallet sign-in has no World ID step (by design — see `O`), unlike
  manufacturer auth.
- `products.token_id`'s purpose is genuinely unresolved (see `F`).
- The authorized "flag a product as `SUSPECT_COUNTERFEIT`/blocked" workflow
  does not exist anywhere in this repo yet — `setProductBlocked()` is ready
  to be its on-chain mirror, but nothing calls it, and grievance resolution
  intentionally does not either (per `O`/the plan's rule against automatic
  flagging).
- Idempotency exists for transfer creation; listing/purchase/cancel routes
  do not yet have their own `idempotencyKey` handling (transfer's pattern is
  ready to copy over).
- No real two-party browser test — every "second wallet" in this session's
  testing is a second throwaway private key used directly, not a second
  human clicking through a UI.

## T. Final verdict

**PARTIALLY COMPLETE.**

The smart-contract + backend + adapter layer for Direct Transfer and C2C
Resale is genuinely real, deployed, and live-verified end-to-end on Hedera
testnet, independently re-checked at every step — this is not a claim made
on the strength of "tests pass," it's backed by transaction hashes,
on-chain reads, and Supabase rows checked after the fact. Grievance's
backend is equally real. **What keeps this from "COMPLETE"**: Resale/
Grievance have no browser UI yet, and no actual browser/manual QA has been
performed anywhere in this work — both are named explicitly rather than
implied away.
