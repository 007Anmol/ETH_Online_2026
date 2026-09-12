# Consumer Backend Plan — Transfer, Resale, Grievance

Status: **planning document**. Nothing in this file has been implemented yet — the
three consumer features (`lib/consumer/mock/mock-transfer-provider.ts`,
`mock-marketplace-provider.ts`, `mock-grievance-provider.ts`) are still fully
mock/in-memory, as confirmed by the running app. This plan is the bridge from
that mock layer to a real backend, without touching another team's repository.

**Important context this plan is grounded in** (verified against this repo, not
assumed): the "Supply Chain" architecture referenced below is **not** copied from
a teammate's ZIP file-by-file — this repo already reserves the exact same shape
for it. `contracts/src/VeriChainEscrow.sol` and `VeriChainHook.sol` are literally
empty stubs today ("Team 2/3 reserved — not used for batch/tag identity"), but
the **database schema for both already exists** in this repo:

- `supabase/migrations/0002_enums.sql` — `product_status`, `escrow_status`,
  `resale_status`, `permission`, `product_event_type` enums already include
  resale/ownership values: `SUSPECT_COUNTERFEIT`, `SOLD`, `OWNED`,
  `RESALE_INITIATED`, `PHYSICAL_HANDOFF_PENDING`, `NEW_OWNER_CONFIRMED`,
  `REVOKED`; `escrow_status` = `PENDING | LOCKED | RELEASED | FROZEN | REFUNDED`;
  `resale_status` = `INITIATED | AWAITING_PHYSICAL_HANDOFF | HANDOFF_CONFIRMED |
  OWNERSHIP_TRANSFERRED | CANCELLED`.
- `supabase/migrations/0005_team2_supply_chain.sql` — `escrows` table (org-to-org,
  `buyer_org_id`/`seller_org_id`, not consumer wallets).
- `supabase/migrations/0006_team3_ownership_resale.sql` — `ownership_records` and
  `resale_listings` tables **already exist**, and `resale_listings.escrow_id`
  already references `escrows(id)`.
- `supabase/migrations/0004_team1_manufacturing.sql` — `product_events` is an
  append-only structured event log (`event_type product_event_type`, `payload
  jsonb`, `chain_tx_hash`, `block_number`) already wired for exactly the kind of
  structured logging this plan needs (Phase 6) — it already has `OWNERSHIP_CLAIMED`,
  `RESALE_INITIATED`, `PHYSICAL_HANDOFF_CONFIRMED`, `ESCROW_FROZEN`,
  `ESCROW_RELEASED` event types.
- `lib/auth/authorization.ts` — `requireManufacturer()` is the exact pattern to
  clone into `requireConsumer()`: read `getSession()`, re-verify the profile row
  server-side via the service-role client, never trust the client-sent identity.
- `lib/session.ts` — `Session` already carries `role`, and `user_role` already
  includes `CONSUMER`. No new session/cookie mechanism is needed.
- `frontend/CONSUMER_API_PLAN.md` — existing gap analysis; read it first, it is
  the up-to-date map of what's real vs. mock as of the last audit.

**What is genuinely missing** (do not assume it exists): there is no ERC-721/1155
contract for consumer NFT ownership anywhere in this repo — `products.token_id`
is the "digital twin" ID minted by Team 1's registry, not a separate consumer
ownership token. `escrows` is organization-scoped, not wallet-to-wallet, so it
is very likely **not** directly reusable for consumer-to-consumer resale as-is
(see Phase 3). Treat both as open questions to flag, not to silently paper over.

---

## Architecture (target end state)

```
CONSUMER FRONTEND (existing, do not rebuild)
        │
        ▼
   React hooks
        │
        ▼
Consumer providers (existing interfaces — keep them)
  TransferProvider | MarketplaceProvider | GrievanceProvider
        │
        ▼
Consumer API clients (new — lib/consumer/api/*.ts)
        │
        ▼
Next.js API routes (new — app/api/consumer/**/route.ts)
        │
        ▼
Service layer (new — lib/consumer/services/*.ts)
        │
        ▼
      Supabase (service-role client, existing lib/supabase.ts)
        │
   ┌────┴─────┐
   ▼          ▼
App state   Adapters (new — lib/consumer/adapters/*.ts)
              │
      ┌───────┴────────┐
      ▼                ▼
NFTTransferAdapter   MarketplaceSettlementAdapter
 (mock now, real      (mock now, real contract/escrow
  contract later)      decision later)
```

Rule for every layer: **the frontend never talks to Supabase or an adapter
directly.** `lib/consumer/mock/*` stays as the `mock` implementation; a new
`lib/consumer/api/*` becomes the `real` implementation of the same provider
interfaces (`ProductDataProvider`, `OwnershipProvider`, `TransferProvider`,
`MarketplaceProvider`, `GrievanceProvider` — all already defined in
`lib/consumer/providers.ts`, unchanged). `lib/consumer/registry.ts` picks one
via an explicit flag (`CONSUMER_DATA_MODE=mock|api`), never silently.

---

## Architecture correction — blockchain-first, asynchronous backend reconciliation

**This section overrides the transaction-ordering details in Phases 2, 3, 6,
and 7 below.** Read this before implementing any of those phases; the state
machines and phase text further down have been updated to match it, but this
is the rule those updates are derived from, stated once so it can't drift.

**The problem with a naive implementation:** writing the "attempt" row to
Supabase, then calling the adapter, then writing the result (as a literal
reading of Phase 3's original three-step description would suggest) puts
Supabase in the critical path between "user signs" and "user sees progress."
For a real Hedera transaction that is unnecessary latency and, worse, it makes
a temporary Supabase outage look like a failed transaction to the user even
though the transaction actually succeeded on-chain.

**The corrected rule: for anything that touches the blockchain, the
blockchain is authoritative and immediate; Supabase is an asynchronous,
best-effort index of it, never a gate in front of it.**

```
HEDERA > SUPABASE
```

for blockchain state specifically — `ownerOf(tokenId)` is authoritative for
NFT ownership, the settlement/escrow contract's own state/events are
authoritative for a resale, not whatever `resale_settlements.status` currently
says. Supabase's job is to make that state queryable/indexed, and to recover
it if it was temporarily behind.

### Corrected transfer flow

```
Consumer A
    │
    ▼
Transfer UI (existing TransferFlow.tsx)
    │
    ▼
Backend preflight (requireConsumer + ownership/self-transfer/no-active-listing
                    checks from Phase 3.1 — this part IS synchronous, it's
                    authorization, not blockchain confirmation)
    │
    ▼
Wallet requests signature
    │
    ▼
Hedera transaction submitted
    │
    ▼
REAL TX HASH returned immediately
    │
    ├───────────────► UI shows "Transaction submitted" + tx hash NOW
    │                  (does not wait for any Supabase write)
    │
    ├───────────────► Confirmation watcher (frontend polls the tx receipt,
    │                  or a thin backend "watch" endpoint proxies Hedera —
    │                  either way this path talks to Hedera, not Supabase)
    │                       │
    │                       ▼
    │                  receipt confirmed
    │                       │
    │                       ▼
    │                  read ownerOf(tokenId)
    │                       │
    │                       ▼
    │                  recipient owns it → UI shows "Ownership transferred"
    │
    └───────────────► Backend reconciliation (async, in parallel)
                            │
                            ▼
                       ownership_transfers.status = CONFIRMED
                       ownership_records updated
                       product_events row written
```

If the backend reconciliation step is slow or temporarily fails, the UI does
**not** regress to an error state — it shows something like *"Ownership
confirmed on Hedera — syncing activity"* and keeps `sync_status = PENDING`
(Phase 1 migration adds this column) until reconciliation catches up.

### Corrected resale settlement flow

```
Buyer clicks Buy
    │
    ▼
Backend preflight: listing ACTIVE, seller still owns it, product not
SUSPECT_COUNTERFEIT/REVOKED, price matches (synchronous — authorization only)
    │
    ▼
Wallet requests signature
    │
    ▼
Hedera transaction submitted → REAL TX HASH immediately
    │
    ├─► UI: "Transaction submitted" + tx hash
    │
    ├─► Watcher: escrow funded (event/state) → UI: "Payment secured in escrow"
    │       │
    │       ▼
    │   NFT transfer event/state → read ownerOf(tokenId) == buyer
    │       │                        → UI: "Ownership confirmed"
    │       ▼
    │   escrow released (event/state) → UI: "Payment released to seller"
    │       │
    │       ▼
    │   UI: "Sale completed"
    │
    └─► Backend reconciliation (async, parallel): resale_settlements.status,
        resale_listings.status = SOLD, ownership_records updated,
        product_events written
```

### Operation-record state model (replaces the flat status enums in Phase 1 where a real chain call is involved)

```
PENDING_SIGNATURE → SUBMITTED (+ txHash) → CONFIRMING → CONFIRMED
                                                       ↘ FAILED / REVERTED
```

plus an **independent** `sync_status` on the same row:
`PENDING | SYNCED | SYNC_FAILED` — so `CONFIRMED + SYNC_FAILED` is a valid,
non-alarming combined state (blockchain succeeded, indexing hasn't caught up
yet), and it is never collapsed into a single "FAILED" the way a naive
implementation would. Phase 1's migration SQL should add `sync_status` to
both `ownership_transfers` and `resale_settlements` accordingly, and
`transfer_status`/`settlement_status` should gain `PENDING_SIGNATURE` and
`CONFIRMING` values (the mock adapters can skip `PENDING_SIGNATURE` — there is
no wallet prompt in mock mode — but the real adapter must not).

### Reconciliation worker

A small, separate concern from the request-handling service layer: given a
`txHash` (or an operation id), it must be able to independently:

1. query Hedera for the receipt/event,
2. verify the resulting state (`ownerOf`, escrow contract state),
3. update Supabase idempotently (never duplicate a row for a `txHash` already
   reconciled),
4. write the corresponding `product_events` row,
5. set `sync_status = SYNCED`.

This is what recovers all of the following without ever needing a fake retry
or a second on-chain transaction:

- Supabase was down when the chain confirmed → reconciler catches up later.
- The frontend tab closed/refreshed mid-confirmation → reopening the page
  re-fetches the operation by id and the watcher resumes from Hedera state,
  not from wherever the UI's local state left off.
- The backend process crashed after submission but before its own write →
  reconciler finds the `txHash` (from wherever it was durably recorded before
  submission — the operation row created at `PENDING_SIGNATURE`/`SUBMITTED`)
  and resolves it from Hedera, not from re-deriving it from scratch.
- The same `txHash` is reconciled twice (e.g. worker retried) → idempotent
  update, not a duplicate `ownership_records`/`product_events` row.

**Double-buy must be safe even without the reconciler**: two concurrent
purchase submissions racing the same listing must be rejected at the contract
level (only one settlement transaction can succeed) — `Supabase`'s
`uq_one_active_settlement_per_listing` (Phase 1) is a defense-in-depth
application-level guard, not the only line of defense. Don't rely on it alone
once a real settlement contract exists.

### Logging gets a `source` field

Every structured log/event now carries where it came from, so a genuine
on-chain success is never confused with a backend indexing failure:

```json
{ "event": "ownership.transfer.submitted", "source": "frontend", "operationId": "...", "txHash": "0x...", "network": "hedera-testnet" }
{ "event": "ownership.transfer.receipt.confirmed", "source": "blockchain", "operationId": "...", "txHash": "0x...", "blockNumber": 123 }
{ "event": "ownership.transfer.backend.persisted", "source": "backend", "operationId": "...", "status": "CONFIRMED", "syncStatus": "SYNCED" }
```

Dotted names above (`ownership.transfer.*`, `marketplace.*`) are the
dev-console/structured-log event names; Phase 6's `product_events.event_type`
enum values (`TRANSFER_SUBMITTED`, etc., SCREAMING_SNAKE per existing
convention in `0002_enums.sql`) are the persisted equivalents — keep an
explicit 1:1 name mapping in the service layer rather than trying to reuse one
naming style for both.

### Absolutely forbidden once a real adapter exists

- `setTimeout`-simulated progress standing in for a receipt/confirmation.
- A fabricated transaction hash.
- Marking `CONFIRMED`/`COMPLETED` from a database write alone, without the
  corresponding on-chain read (`ownerOf`, escrow state) having actually been
  performed and having actually matched.
- Collapsing "blockchain confirmed, Supabase sync pending/failed" into a
  plain "FAILED" shown to the user.

This does **not** apply to the current mock adapters (Phase 2) — they are
allowed to resolve deterministically and quickly precisely because they are
clearly labelled mock. It applies once `NFT_TRANSFER_ADAPTER=real` /
`MARKETPLACE_SETTLEMENT_ADAPTER=real` exists.

### Extra test scenarios this adds to Phase 10

Beyond the original five (direct transfer, resale success, resale blocked,
double buy, grievance isolation), a real-adapter implementation is not done
until these are also covered (mark them explicitly not-yet-automatable in
`scripts/test-consumer-features.ts` until Hedera testnet access exists in the
test environment, same as this plan's Test 3/4 stubs already do):

1. Real tx hash returned and shown before any Supabase write completes.
2. Backend reconciliation delayed — UI still shows verified on-chain success.
3. Backend reconciliation fails after blockchain success — state becomes
   `CONFIRMED` + `SYNC_FAILED`, not `FAILED`.
4. Frontend refresh mid-confirmation recovers from the operation id, not from
   lost local state.
5. Backend process restart after submission recovers via the reconciler.
6. Same `txHash` reconciled twice — no duplicate rows.
7. Same `idempotencyKey` submitted twice — no duplicate transaction.
8. Wallet signature rejected — clean `FAILED`, no partial state.
9. Transaction reverted on-chain — clean `FAILED`/`REVERTED`, no ownership
   change, no settlement `COMPLETED`.
10. Transaction pending far longer than expected — UI has a sane
    timeout/"still confirming" state, does not hang forever or silently
    fail.

---

## Phase 0 — Inspection (no code changes)

1. Re-read `frontend/CONSUMER_API_PLAN.md` for drift since last written.
2. Re-read `supabase/migrations/0002`, `0004`, `0005`, `0006`, `0007` in full.
3. Re-read `lib/auth/authorization.ts`, `lib/session.ts`, `lib/supabase.ts`,
   `lib/constants.ts`.
4. Read one full existing route for conventions, e.g. `app/api/nfc/verify/route.ts`
   and `app/api/batches/route.ts` (request validation, error shape, status codes).
5. Confirm whether `escrows.buyer_org_id`/`seller_org_id` can be nullable for a
   consumer wallet, or whether a consumer-specific escrow table is required
   (see Phase 3 decision).
6. Confirm current RLS policies (`0007_rls.sql`) — only `products` is
   anon-readable; every consumer write must go through the service-role client
   inside an API route, never from the browser.

**Exit criteria:** a short note (in this file's changelog section at the bottom)
confirming what changed since the assumptions above were written, before
touching migrations.

---

## Phase 1 — Database migrations (additive only)

New migration file: `supabase/migrations/0010_consumer_features.sql`.

Do **not** rename or drop `ownership_records` / `resale_listings` — extend them.

```sql
-- Transfers: direct wallet-to-wallet NFT ownership moves (no payment).
-- PENDING_SIGNATURE/CONFIRMING only apply once a real wallet+adapter exists;
-- the mock adapter goes straight PENDING -> CONFIRMED/FAILED.
create type transfer_status as enum (
  'PENDING', 'PENDING_SIGNATURE', 'SUBMITTED', 'CONFIRMING', 'CONFIRMED', 'FAILED', 'REVERTED'
);
create type sync_status as enum ('PENDING', 'SYNCED', 'SYNC_FAILED');

create table ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete restrict,
  from_wallet_address text not null,
  to_wallet_address text not null,
  status transfer_status not null default 'PENDING',
  -- Blockchain state is authoritative; this tracks whether Supabase's copy of
  -- it is caught up. CONFIRMED + SYNC_FAILED is a valid, non-alarming state —
  -- see "Architecture correction" above. Never collapse it into FAILED.
  sync_status sync_status not null default 'PENDING',
  chain_tx_hash text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_ownership_transfers_updated_at before update on ownership_transfers
  for each row execute function set_updated_at();
create index idx_ownership_transfers_product on ownership_transfers (product_id);

-- Resale purchase/settlement — one row per buy attempt against a listing.
create type settlement_status as enum (
  'PURCHASE_PENDING', 'PAYMENT_PROTECTED', 'PRODUCT_VALIDATION',
  'SETTLEMENT_BLOCKED', 'SETTLEMENT_PENDING', 'NFT_TRANSFER_PENDING',
  'OWNERSHIP_CONFIRMED', 'PAYMENT_RELEASED', 'COMPLETED', 'FAILED'
);

create table resale_settlements (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references resale_listings(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  buyer_wallet_address text not null,
  seller_wallet_address text not null,
  amount numeric not null,
  currency text not null default 'HBAR',
  status settlement_status not null default 'PURCHASE_PENDING',
  escrow_id uuid references escrows(id),
  transfer_id uuid references ownership_transfers(id),
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_resale_settlements_updated_at before update on resale_settlements
  for each row execute function set_updated_at();
create index idx_resale_settlements_listing on resale_settlements (listing_id);

-- Only one non-terminal settlement per listing at a time (blocks the double-buy race).
create unique index uq_one_active_settlement_per_listing on resale_settlements (listing_id)
  where status not in ('COMPLETED', 'FAILED');

-- Grievances.
create type grievance_category as enum (
  'COUNTERFEIT_SUSPICION', 'DAMAGED_PRODUCT', 'MISSING_HISTORY',
  'OWNERSHIP_DISPUTE', 'OTHER'
);
create type grievance_status as enum (
  'OPEN', 'UNDER_REVIEW', 'WAITING_FOR_CONSUMER', 'RESOLVED', 'REJECTED', 'ESCALATED'
);

create table grievances (
  id uuid primary key default gen_random_uuid(),
  grievance_number text not null unique, -- e.g. GRV-000001, generated server-side
  consumer_profile_id uuid not null references profiles(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  category grievance_category not null,
  description text not null,
  evidence_ref text, -- storage key/path, never a raw client-supplied path
  status grievance_status not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create trigger trg_grievances_updated_at before update on grievances
  for each row execute function set_updated_at();
create index idx_grievances_consumer on grievances (consumer_profile_id);
create index idx_grievances_product on grievances (product_id);

create table grievance_events (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references grievances(id) on delete cascade,
  status grievance_status not null,
  note text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_grievance_events_grievance on grievance_events (grievance_id);

-- Extend the existing structured event log instead of inventing a parallel one.
alter type product_event_type add value 'TRANSFER_SUBMITTED';
alter type product_event_type add value 'TRANSFER_CONFIRMED';
alter type product_event_type add value 'TRANSFER_FAILED';
alter type product_event_type add value 'SETTLEMENT_BLOCKED';
alter type product_event_type add value 'SETTLEMENT_COMPLETED';
alter type product_event_type add value 'GRIEVANCE_SUBMITTED';
alter type product_event_type add value 'GRIEVANCE_STATUS_CHANGED';

alter table ownership_transfers enable row level security;
alter table resale_settlements enable row level security;
alter table grievances enable row level security;
alter table grievance_events enable row level security;
-- No anon policies added: every read/write for these four tables goes through
-- an API route using the service-role client, matching 0007_rls.sql's model.
```

**Exit criteria:** migration applies cleanly against a fresh `supabase db reset`
(or the project's equivalent), `npm run supabase:check` still passes.

---

## Phase 2 — Adapters (mock now, real boundary documented)

`lib/consumer/adapters/nft-transfer-adapter.ts`

```ts
export interface NFTTransferAdapter {
  transfer(input: { productId: string; tokenId: number | null; from: string; to: string }):
    Promise<{ status: "SUBMITTED" | "CONFIRMED" | "FAILED"; transactionHash?: string }>;
  getStatus(input: { transferId: string }):
    Promise<{ status: "PENDING" | "CONFIRMED" | "FAILED"; transactionHash?: string }>;
}
```

`lib/consumer/adapters/marketplace-settlement-adapter.ts`

```ts
export interface MarketplaceSettlementAdapter {
  protectPayment(input: { settlementId: string; amount: number; currency: string }):
    Promise<{ status: "PROTECTED" | "FAILED" }>;
  settle(input: { settlementId: string }):
    Promise<{ status: "SETTLED" | "FAILED" }>;
  release(input: { settlementId: string }):
    Promise<{ status: "RELEASED" | "FAILED" }>;
}
```

Both get a `Mock*Adapter` implementation now (deterministic, synchronous
resolution — **no `setTimeout`-driven fake progress bars standing in for real
chain confirmation**; if a step is not real yet, the service layer marks it and
says so explicitly, see Phase 6) and a documented `// TODO(blockchain-team):`
boundary for the real implementation. Selection goes through an explicit env
flag (`NFT_TRANSFER_ADAPTER=mock`, `MARKETPLACE_SETTLEMENT_ADAPTER=mock`), not
a silent fallback.

**Open decision to raise with the team, not resolve unilaterally:** is the
existing `escrows` table (org-scoped, owner-controlled release, built for
manufacturer↔distributor payment) appropriate for consumer-to-consumer resale,
or does resale need its own escrow concept? Recommendation in this plan: treat
`escrows` as *not* a fit as-is (wrong ownership model, wrong release authority)
and build `MarketplaceSettlementAdapter` as the seam instead of forcing reuse.
Do not silently make an owner-controlled release model look trustless to the
consumer-facing UI.

---

## Phase 3 — Service layer

`lib/consumer/services/transfer-service.ts`, `marketplace-service.ts`,
`grievance-service.ts`. Each service:

1. Takes an already-authenticated `Session` (never re-derives identity from a
   request body).
2. Validates state against Supabase (ownership, listing status, product
   status) before any adapter call.
3. Writes the "attempt" row first (`PENDING`/`PURCHASE_PENDING`/etc.), then
   calls the adapter, then writes the resulting state — never marks a terminal
   state before the adapter actually returns it.
4. Emits a `product_events` row for every transition (Phase 6).

### 3.1 Transfer state machine

```
PENDING → SUBMITTED → CONFIRMED
                    ↘ FAILED
```

Guards before `PENDING` is even created:
- session resolves to a `CONSUMER` profile,
- `ownership_records` shows this profile currently owns `productId`,
- `to_wallet_address` is a syntactically valid, non-empty address,
- `to_wallet_address` != current owner's wallet,
- no `resale_listings` row for this product is `ACTIVE`,
- no other `ownership_transfers` row for this product is non-terminal.

### 3.2 Resale settlement state machine

```
PURCHASE_PENDING → PAYMENT_PROTECTED → PRODUCT_VALIDATION
                                          │
                              ┌───────────┴───────────┐
                              ▼                       ▼
                      SETTLEMENT_BLOCKED       SETTLEMENT_PENDING
                                                       │
                                                       ▼
                                             NFT_TRANSFER_PENDING
                                                       │
                                                       ▼
                                             OWNERSHIP_CONFIRMED
                                                       │
                                                       ▼
                                              PAYMENT_RELEASED
                                                       │
                                                       ▼
                                                  COMPLETED
```

`PRODUCT_VALIDATION` gate (the one rule worth carrying over from the reference
Supply Chain design, even though its contract is a stub in this repo): **do not
advance past this state if the product's `product_status` is
`SUSPECT_COUNTERFEIT` or `REVOKED`.** Land on `SETTLEMENT_BLOCKED` instead, and
never write `COMPLETED` on the listing (`resale_listings.status` stays out of
`OWNERSHIP_TRANSFERRED`), never update `ownership_records`, never invent a
refund event unless a real refund mechanism exists.

Double-buy protection: `uq_one_active_settlement_per_listing` (Phase 1) makes a
second concurrent `PURCHASE_PENDING` insert for the same listing fail at the
database level — the service layer treats that unique-violation as "listing
unavailable", not a 500.

### 3.3 Grievance flow

```
form → OPEN → UNDER_REVIEW → RESOLVED
                 │              ↑
                 ├──────────────┘
                 ├→ WAITING_FOR_CONSUMER
                 ├→ ESCALATED
                 └→ REJECTED
```

A consumer can only ever create `OPEN` and never set status directly — status
transitions are a separate authorized action (manufacturer/admin role), out of
scope for this phase's consumer-facing endpoints but the column/enum must
already forbid consumer-supplied status on create.

**Filing a grievance never sets `product_status = SUSPECT_COUNTERFEIT` by
itself.** That flag is an authorized investigation outcome, not an automatic
side effect — but once a product *is* flagged (by whatever authorized path
does that), Phase 3.2's gate means future resale on it is blocked. This is the
one place all three features connect into a single story instead of three
unrelated pages.

---

## Phase 4 — API routes

Follow the existing `app/api/**/route.ts` + `requireManufacturer()`-style
convention; new `requireConsumer()` in `lib/auth/authorization.ts` mirrors it
exactly (session → re-verify profile row via service client → check
`role === 'CONSUMER'`).

| Method & path | Purpose |
|---|---|
| `POST /api/consumer/transfers` | Body: `{ productId, toWalletAddress, idempotencyKey }`. Returns the created/looked-up transfer. |
| `GET /api/consumer/transfers/:id` | Current transfer status. |
| `POST /api/consumer/marketplace/listings` | Create a listing. Body: `{ productId, priceAmount, currency }`. |
| `GET /api/consumer/marketplace/listings` | Active listings (public-ish; still requires a consumer session per current auth model). |
| `GET /api/consumer/marketplace/listings/:id` | One listing. |
| `PATCH /api/consumer/marketplace/listings/:id` | `{ action: "cancel" }` — closes the gap noted below. |
| `POST /api/consumer/marketplace/listings/:id/purchase` | Starts a settlement. Body: `{ idempotencyKey }`. |
| `GET /api/consumer/marketplace/settlements/:id` | Settlement status (poll target for Phase 7 UI). |
| `POST /api/consumer/grievances` | `{ productId, category, description, evidenceRef? }`. |
| `GET /api/consumer/grievances` | Current consumer's own grievances only. |
| `GET /api/consumer/grievances/:id` | One grievance + its `grievance_events` timeline. Must 404 (not 403) for another consumer's grievance to avoid confirming existence — decide and document which the team prefers; default to 404. |

**Test-harness prerequisite:** `lib/auth/mock-login.ts` currently only exports
`loginAsDemoManufacturer()` (used by `POST /api/auth/mock-login`, gated behind
`ALLOW_TEST_AUTH=true`). Add `loginAsDemoConsumerA()` / `loginAsDemoConsumerB()`
mirroring it exactly (look up a seeded `profiles` row with `role = 'CONSUMER'`,
`organization_id null`), and extend `POST /api/auth/mock-login` to accept
`{ as: "manufacturer" | "consumerA" | "consumerB" }` (default
`"manufacturer"`, unchanged for existing callers). Seed two demo consumer
profiles + one demo owned product in `supabase/seed.sql` (or a new
`scripts/seed-consumer.ts`) so `scripts/test-consumer-features.ts` (Phase 10)
has two distinct consumer identities to prove grievance/listing isolation
between them, plus a product each of them owns going in. This is a prerequisite
for Phase 10, not a production auth change.

Idempotency: every `POST` above accepts a client-supplied `idempotencyKey`
(UUID), stored in the row's unique `idempotency_key` column; a retried request
with the same key returns the existing row instead of creating a duplicate —
mirrors the batch-creation idempotency already implied by
`manufacturing_operations`.

---

## Phase 5 — Frontend wiring (do not rebuild the UI)

`lib/consumer/registry.ts` currently hardcodes the mock providers. Change it
to select an implementation by env var, default to `mock` so nothing breaks
today:

```ts
const MODE = process.env.NEXT_PUBLIC_CONSUMER_DATA_MODE ?? "mock";
export const transferProvider: TransferProvider =
  MODE === "api" ? new ApiTransferProvider() : new MockTransferProvider();
// ...same pattern for marketplaceProvider, grievanceProvider
```

`lib/consumer/api/consumer-transfer-api.ts`,
`consumer-marketplace-api.ts`, `consumer-grievance-api.ts` — thin `fetch`
wrappers (the only place allowed to call `fetch("/api/consumer/...")`); each
`Api*Provider` in `lib/consumer/api/*-provider.ts` implements the existing
provider interface using these clients. Components keep calling the provider
through the registry exactly as they do today — **zero changes to any
component in `components/consumer/**` are required for this phase.**

**Fix the known UI gap while wiring this:** `MarketplaceProvider.cancelListing`
already exists in the interface and mock, and `MarketplaceBrowser.tsx` already
has a "Cancel listing" button calling it (added in the previous session) — when
swapping to the API provider, make sure `cancelListing` maps to
`PATCH /api/consumer/marketplace/listings/:id { action: "cancel" }` and rejects
(surfacing an error state, not a silent no-op) when the listing is already
`SOLD`/`CANCELLED` or has a non-terminal settlement against it.

---

## Phase 6 — Structured logging (reuse `product_events`, do not invent a parallel log)

Every service-layer transition writes one `product_events` row:
`{ event_type, product_id, payload: { transferId | listingId | settlementId | grievanceId, ...safe fields }, occurred_at }`.

Event names (extend `product_event_type`, Phase 1):

```
TRANSFER_SUBMITTED   TRANSFER_CONFIRMED   TRANSFER_FAILED
SETTLEMENT_BLOCKED   SETTLEMENT_COMPLETED
GRIEVANCE_SUBMITTED  GRIEVANCE_STATUS_CHANGED
```

Additionally, plain structured console logs (JSON, one line per event) for
local/dev visibility, e.g.:

```json
{"event":"marketplace.settlement.started","settlementId":"...","listingId":"...","adapter":"MOCK"}
```

Rule: whenever an adapter is the mock implementation, the log line and the API
response both say so explicitly (`"adapter":"MOCK"` / `"nftTransferAdapter":"MOCK"`)
— never present a mock confirmation as if it came from Hedera. Never log
private keys, session tokens, service-role keys, full grievance description
text, or raw evidence content — log references/IDs only.

---

## Phase 7 — UI state polling

Transfer/Resell/Report flow components (already built) currently resolve
their "processing" stage from a single provider call. Once wired to the API
provider, `getTransfer` / `getSettlementStatus` / grievance status become real
poll targets — poll every ~1.5s while status is non-terminal, stop on
`CONFIRMED|FAILED|COMPLETED|SETTLEMENT_BLOCKED`. No UI redesign required, only
the existing "processing" stage's data source changes from an instant mock
resolve to a real poll loop.

---

## Phase 8 — Security & regression checklist

Audit before calling this done:
- [ ] Every consumer API route calls `requireConsumer()` first; no route trusts
      `ownerId`/`sellerId`/`buyerId`/`consumerId` from the request body.
- [ ] `to_wallet_address` cannot equal current owner (self-transfer rejected).
- [ ] A consumer cannot list a product they don't own, cancel someone else's
      listing, or read another consumer's grievance (IDOR check both ways).
- [ ] Concurrent purchase attempts on one listing: verify
      `uq_one_active_settlement_per_listing` actually rejects the second one
      (write the double-buy test, Phase 9, before marking this done).
- [ ] `SUSPECT_COUNTERFEIT`/`REVOKED` product blocks settlement — verify with a
      real fixture, not just code review.
- [ ] No endpoint returns a fabricated `transactionHash` while
      `adapter === "MOCK"`.
- [ ] Existing routes/pages untouched: `/consumer`, `/consumer/scan`,
      `/consumer/products`, `/consumer/profile`, `/consumer/marketplace`,
      `/consumer/grievances` and their dynamic children all still 200.
      `/api/nfc/*`, `/api/batches`, `/api/auth/*` unchanged.

---

## Phase 9 — Manual API tests (curl)

```bash
BASE=http://localhost:3000
COOKIE=$(curl -s -i -X POST "$BASE/api/auth/mock-login" | grep -i 'set-cookie' | sed 's/.*: //;s/;.*//')

# Transfer
curl -s -X POST "$BASE/api/consumer/transfers" \
  -H 'content-type: application/json' -H "cookie: $COOKIE" \
  -d '{"productId":"<owned-product-uuid>","toWalletAddress":"0xabc...","idempotencyKey":"11111111-1111-1111-1111-111111111111"}'
curl -s "$BASE/api/consumer/transfers/<transferId>" -H "cookie: $COOKIE"

# Resale
curl -s -X POST "$BASE/api/consumer/marketplace/listings" \
  -H 'content-type: application/json' -H "cookie: $COOKIE" \
  -d '{"productId":"<owned-product-uuid>","priceAmount":20,"currency":"HBAR"}'
curl -s "$BASE/api/consumer/marketplace/listings"
curl -s -X POST "$BASE/api/consumer/marketplace/listings/<listingId>/purchase" \
  -H 'content-type: application/json' -H "cookie: $COOKIE" \
  -d '{"idempotencyKey":"22222222-2222-2222-2222-222222222222"}'
curl -s "$BASE/api/consumer/marketplace/settlements/<settlementId>" -H "cookie: $COOKIE"
curl -s -X PATCH "$BASE/api/consumer/marketplace/listings/<listingId>" \
  -H 'content-type: application/json' -H "cookie: $COOKIE" -d '{"action":"cancel"}'

# Grievance
curl -s -X POST "$BASE/api/consumer/grievances" \
  -H 'content-type: application/json' -H "cookie: $COOKIE" \
  -d '{"productId":"<owned-product-uuid>","category":"DAMAGED_PRODUCT","description":"Strap arrived torn."}'
curl -s "$BASE/api/consumer/grievances" -H "cookie: $COOKIE"
curl -s "$BASE/api/consumer/grievances/<grievanceId>" -H "cookie: $COOKIE"
```

Each call's expected HTTP status, response shape, resulting DB row, and
resulting `product_events` row should be written down next to it once real
IDs exist (this file is the template; fill in a dated results section per run,
same convention as `frontend/slice_4_results.md`-style files elsewhere in this
repo).

---

## Phase 10 — Automated test file

See `scripts/test-consumer-features.ts` (added alongside this plan), following
the exact convention of `scripts/test-auth-security.ts` /
`scripts/test-batches.ts` / `scripts/test-helpers.ts` (`createReporter`,
`requireApp`, `TEST_BASE`, `loginCookie`). It currently **fails intentionally**
because none of the `app/api/consumer/**` routes exist yet — that is expected
until Phase 4 is implemented; treat a fully-green run of this script as the
acceptance test for Phases 1–8. It covers the five scenarios below (mirroring
this plan's state machines, not a generic smoke test):

1. **Direct transfer** — owned product, valid recipient → `PENDING` →
   `CONFIRMED`, ownership row moves.
2. **Resale success** — list → active → buy → `PAYMENT_PROTECTED` →
   `PRODUCT_VALIDATION` → `SETTLEMENT_PENDING` → `NFT_TRANSFER_PENDING` →
   `OWNERSHIP_CONFIRMED` → `PAYMENT_RELEASED` → `COMPLETED`, listing `SOLD`.
3. **Resale blocked** — same as above, but product flagged
   `SUSPECT_COUNTERFEIT` before settlement — must land on
   `SETTLEMENT_BLOCKED`, never `COMPLETED`.
4. **Double buy** — two concurrent purchase requests on one listing — exactly
   one succeeds, the other gets a clear conflict, not a 500.
5. **Grievance isolation** — consumer A creates a grievance; consumer B's
   `GET /api/consumer/grievances/:id` for A's grievance must not return it.

Run with:

```bash
npm run test:consumer-features
```

(script added to `package.json`; deliberately **not** folded into the
aggregate `npm run test` yet, since that would break CI/dev today for a
feature that isn't implemented — fold it in as part of Phase 4/8 sign-off.)

---

## Build order (do in this order, stop and ask if a step needs touching
protected files)

```
Phase 0  Inspect (read-only)
Phase 1  Migrations
Phase 2  Adapters (mock)
Phase 3  Services + state machines
Phase 4  API routes
Phase 5  Frontend provider wiring (api mode)
Phase 6  Structured logging
Phase 7  UI polling
Phase 8  Security/regression checklist
Phase 9  Manual curl pass, recorded
Phase 10 Automated test file green
```

Do not modify: `lib/nfc/*`, anything under `app/api/nfc/*`, `app/api/batches/*`,
`app/api/manufacturing/*`, `contracts/*`, or any other team's migration file —
only add new, additive migrations and new `app/api/consumer/*` routes.

---

## What's working vs. what's waiting on the blockchain/contracts team

**Can be built and tested for real right now (this plan's scope):**
frontend (already exists), API routes, database, business/state-machine
validation, provider wiring, mock adapters, structured logs, curl tests,
`scripts/test-consumer-features.ts`.

**Genuinely blocked on another team, do not fabricate:**
a real NFT/ownership contract and its ABI, the marketplace/escrow contract
decision (Phase 2's open question), the actual payment mechanism, deployed
contract addresses, real transaction confirmation. When those arrive, only
`lib/consumer/adapters/*` should need substantial change — provider
interfaces, API routes, and the database model in this plan should not need to
change shape, only their adapter's internals.

Never say "blockchain integrated" unless a deployed contract is actually being
called and its result verified on-chain/via an indexer.

---

## Design-system consistency — read this before merging any other team's UI

This repo already has one Next.js app serving both consumer-facing pages
(`app/consumer/**`, `app/scan`, `app/product/[id]`) and manufacturer-facing
API routes, sharing one Tailwind setup and one `app/globals.css`. When the
Supply Chain / Manufacturing team's UI (dashboards, batch/product management
screens, checkpoint/custody views) gets merged into this same app later, it
must be re-skinned to this token set rather than merged with its own colors —
otherwise the app will visibly look like two different products stitched
together.

### The tokens (defined once, in `app/globals.css`)

| Token | Light | Dark | Use for |
|---|---|---|---|
| `--background` | `#f7f7f5` | `#111111` | page background |
| `--foreground` | `#171717` | `#f5f5f3` | primary text |
| `--muted` | `#737373` | `#a3a3a3` | secondary text |
| `--border` | `#e5e5e5` | `#2c2c2c` | all borders (no arbitrary hex borders) |
| `--surface` | `#ffffff` | `#191919` | card/panel background |
| `--surface-muted` | `#eeeeec` | `#242424` | skeletons, subtle fills |
| `--accent` | `#6d5ef8` | `#8b7bff` | primary brand accent (violet) |
| `--accent-strong` | `#4c3fe0` | `#a396ff` | accent gradient end / hover |
| `--accent-soft` | `rgba(109,94,248,.14)` | `rgba(139,123,255,.16)` | tinted chips/icons |
| `--accent-glow` | `rgba(109,94,248,.28)` | `rgba(139,123,255,.38)` | button/card glow shadows |
| `--accent-2` | `#16b981` | `#34d399` | secondary accent (emerald) — success/verified |
| `--accent-2-soft` | `rgba(16,185,129,.14)` | `rgba(52,211,153,.16)` | tinted success chips |

Never hardcode a hex color in a component — always reference these CSS
variables (`style={{ color: "var(--accent)" }}` or a Tailwind arbitrary value
`text-[var(--accent)]`), so a future palette change is a one-file edit.

### Utility classes (also in `app/globals.css`, reuse instead of re-inventing)

- `.btn-accent` — the one and only primary-CTA treatment (gradient
  accent→accent-strong, white text, glow shadow, hover brighten). Every
  primary button across the app uses this class, not a bespoke gradient.
- `.gradient-text` — headline/price emphasis (foreground → accent → accent-2
  clipped text).
- `.card-hover` — the one hover treatment for any clickable card (lift + accent
  border + glow shadow on hover).
- Reduced motion is handled globally (`@media (prefers-reduced-motion:
  reduce)` zeroes all animation/transition durations) — new UI must not
  bypass this by hardcoding animation durations outside CSS/Framer Motion
  `transition` props that respect it.

### Layout/typography conventions to match, not reinvent

- Font: **Manrope** (`--font-primary`), loaded once in the root layout — do not
  bring in a second UI font from another team's page.
- Container: use `components/ui/Container.tsx` (`max-w-7xl`, responsive
  padding) for page width, not a bespoke wrapper.
- Cards: `border border-[var(--border)] bg-[var(--surface)] p-5|p-6`, sharp
  corners by default (this app does not round card corners; only pills/badges/
  buttons are `rounded-full`).
- Buttons/pills/badges: always `rounded-full`; status badges follow the
  `{ label, dotClassName, badgeClassName }` shape already established in
  `lib/consumer/status.ts` — a new module (e.g. a batch/product status for
  the manufacturer dashboard) should add its own presentation map in the same
  shape rather than inventing a different badge component.
- Icons: `lucide-react` only, sized 13–20px, `strokeWidth` 1.5–1.75 for
  outline icons — do not introduce a second icon set.
- Motion: `framer-motion` only (no GSAP — it was deliberately removed from
  this app; see git history / prior cleanup). Page/list entrances use a small
  `y: 12–20 → 0` fade with a per-item stagger delay (`index * 0.05–0.06`);
  flow-step transitions use `AnimatePresence mode="wait"`; shared active-tab/
  active-nav indicators use a shared `layoutId`. Match these, don't invent a
  new motion vocabulary per page.
- Ambient background: `components/ui/AmbientBackground.tsx`, mounted once in
  `ConsumerShell` — if a Manufacturer shell is added later, it should mount
  the same component (or a shared one one level up) rather than each area
  having its own competing background treatment.

### Practical merge procedure (when the other team's branch/export lands)

1. Do not `git merge`/copy their `tailwind.config`/`globals.css` wholesale —
   diff it against this repo's and port only genuinely new utilities, not
   colors.
2. For every page/component they bring in: replace any hardcoded color,
   font-family, border-radius, or shadow with the token/utility table above.
3. Reuse `components/ui/Container.tsx`, `components/ui/Button.tsx`,
   `components/consumer/states/{Loading,Empty,Error,Warning}State.tsx` instead
   of their equivalents if they built their own — one set of primitives for
   the whole app.
4. Wrap their authenticated area in its own shell component (e.g.
   `ManufacturerShell`) that mounts `AmbientBackground` + a header following
   `ConsumerHeader`'s pattern (logo, nav links with the shared `layoutId`
   active-pill treatment, `ThemeToggle`), so the two halves of the app feel
   like one product, not two.
5. Run a visual pass at 320/375/390/414/768/1024/1280/1440px on every page
   they bring in (same breakpoints already used for this app).
6. Run `npx tsc --noEmit` and hit every route with curl (200 check) before and
   after the merge, same as this session's own verification method — regressions
   show up immediately as a route going from 200 to 500/404.

---

## Supply-chain compatibility audit (2026-09-12) — required before adapter/backend work

Performed by actually grepping the repo, not by assuming compatibility. Every
claim below is a verified fact about this codebase as it stands today, not a
restatement of the earlier external "teammate's ZIP" description.

**1. Product identity — mostly aligned, one real open question.**
`products.product_id_hash` (`0004_team1_manufacturing.sql`) is
`keccak256(product_code)`, and `VeriChainRegistry` already keys everything by
that same `bytes32` hash. `VeriChainConsumerNFT` deliberately reuses the exact
same scheme (tokenId ≡ `productIdHash`) — **no collision, correct alignment.**
However, `products` also has a separate, currently-unpopulated column:
`token_id bigint unique -- digital twin ID, null until minted`. Nothing in
this repo's code populates it (`grep -rn "token_id"` across `supabase/`
returns only its own column definition). **Open question this plan cannot
answer unilaterally:** was `token_id` reserved for a Hedera Token Service
(HTS) native NFT serial number (a different design path than a custom
Solidity contract), or is it dead/superseded by the `product_id_hash` scheme?
Do not populate `products.token_id` from `VeriChainConsumerNFT` (it has no
numeric id to put there) without confirming this with whoever owns that
column's intent — forcing a value in would misrepresent it either way.

**2. Ownership vs. custody — no collision, because custody doesn't exist in code yet.**
`custody_transfers` (`0005_team2_supply_chain.sql`) is `org_id`-to-`org_id`
(logistics), not wallet-to-wallet — structurally distinct from consumer
ownership already. `grep -rn "currentCustodian\|transferCustody"` across the
whole repo returns **nothing** — that concept (mentioned in this planning
conversation) lives only in the separate teammate repository this plan was
never allowed to copy from, not in this codebase. There is nothing to
collide with today. `ownership_records` (Team 3, already exists) is the
correct table for consumer ownership and is still unwired (Phase 4/5).

**3. `SUSPECT_COUNTERFEIT` synchronization — the authorized trigger doesn't exist yet either.**
`grep -rln "SUSPECT_COUNTERFEIT"` across `frontend/` returns only this plan
file and its own test script — **no anomaly-detection, checkpoint, or
grievance-resolution code anywhere in this repo currently sets that product
status.** `VeriChainMarketplace.setProductBlocked()` is ready to be the
on-chain mirror, but there is presently no off-chain event to call it from.
Building "the authorized investigation outcome that flags a product" is
therefore its own real piece of work, not a hook into something that already
exists — do not assume it's a one-line wire-up.

**4. Escrow — correctly kept separate; this plan's own draft migration had a
mistake, now fixed below.** `grep -rn "on_chain_escrow_id"` across the whole
repo returns **nothing** — that exact field name doesn't exist in this
codebase (a paraphrase from this conversation, not a real column). The real
field is `escrows.chain_tx_hash`, and `resale_listings.escrow_id` is a
foreign key to `escrows(id)` (`0006_team3_ownership_resale.sql`). `escrows`
itself is `buyer_org_id`/`seller_org_id`-scoped (B2B) and defaults
`currency = 'USDC'` — confirmed unused anywhere in `frontend/**/*.ts` today
(`grep` for `resale_listings|ownership_records|escrows` across
`frontend/**/*.ts` returns nothing), so there's no running code to break, but
Phase 1's original draft SQL still had `resale_settlements.escrow_id uuid
references escrows(id)`, which is **wrong for the deployed design**:
`VeriChainMarketplace`'s escrow is pure contract-internal accounting
(`pendingWithdrawals`), not a separate escrow object with its own id — there
is no corresponding `escrows` row to point to for a Consumer sale. **Fix:**
drop that foreign key; `resale_settlements` should carry
`nft_contract_address`, `marketplace_contract_address`, and `chain_tx_hash`
directly instead of borrowing the B2B escrow table. (Phase 1's SQL block
above should be read with this correction — the live version to actually run
is the corrected shape in the migration note right below this audit.)

**5. Payment currency — genuinely different models, correctly not shared.**
Team 2's `escrows.currency` defaults to `'USDC'` (an ERC-20-shaped
assumption for B2B); `VeriChainMarketplace` uses native HBAR (`payable`,
`msg.value`) for C2C. Keep these separate — do not let a future "currency"
column on the consumer side default to `'USDC'` by copy-paste; it should
default to `'HBAR'` and the amount stored must be in the same tinybar-scaled
units the contract actually uses (see the `msg.value` finding below).

**6. Chain/network — consistent.** Both the existing `VeriChainRegistry` and
the new Consumer contracts target the same Hedera testnet, chain id 296, via
the same Hashio RPC (`contracts/foundry.toml`). No mismatch.

**Corrected migration fragment (supersedes the `resale_settlements` table
shape in Phase 1 above):**

```sql
create table resale_settlements (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references resale_listings(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  buyer_wallet_address text not null,
  seller_wallet_address text not null,
  amount_tinybar numeric not null, -- see "msg.value" finding: tinybar units, not 18-decimal wei
  nft_contract_address text not null,
  marketplace_contract_address text not null,
  status settlement_status not null default 'PURCHASE_PENDING',
  chain_tx_hash text,
  transfer_id uuid references ownership_transfers(id),
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- no escrow_id FK to escrows(id) — that table is a distinct, org-scoped B2B
-- concept; this contract's escrow is internal to VeriChainMarketplace and has
-- no separate Supabase row to reference.
```

---

## Shared Hedera transaction utility (2026-09-12) — built where the existing one lives, not a new parallel one

Per the explicit instruction to make the `msg.value`/gas findings "a shared,
tested transaction utility rather than something buried inside the
marketplace UI": this repo already has exactly one shared, server-only
Hedera transaction utility — `services/hedera/src/client.ts`'s
`sendContractCall`, used today by `VeriChainRegistry` writes
(`services/hedera/src/registry.ts`, called from `app/api/batches` etc.). The
right move was to extend that one, not invent a second.

**Changed:** `sendContractCall` now accepts optional `value` (for a payable
call like `buy()`) and `gas` (still defaults to the existing flat
`2_000_000n` every write in this repo has always used — which, per this
session's live testing, already avoids Hedera's `eth_estimateGas`
under-provisioning problem, since this codebase never relied on gas
estimation in the first place).

**Added:** `services/hedera/src/consumer.ts` — `mintConsumerNftOnChain`,
`getConsumerNftOwner`, `getOnChainListing`, `setProductBlockedOnChain`,
`cancelListingOnChain`, and — the core of this section —
`hbarToTinybars`/`hbarToTransactionValue`/`tinybarsToHbarString`, the only
place the tinybar/weibar conversion should ever happen. Exported from
`@verichain/hedera`'s `index.ts` alongside the existing registry exports.

**Added:** `packages/shared/constants/chains.ts` gained
`HEDERA_CONSUMER_NFT_ADDRESS`, `HEDERA_CONSUMER_MARKETPLACE_ADDRESS`, and
`HEDERA_TINYBARS_PER_HBAR`, following the exact pattern already established
for `HEDERA_REGISTRY_ADDRESS`. Real ABI JSON files were generated via
`forge build` and placed at `packages/shared/abi/VeriChainConsumerNFT.json`
/ `VeriChainMarketplace.json`, and the package's `exports` map (in
`packages/shared/package.json`) was extended to allow importing them — this
turned out to be *why* the first typecheck attempt failed (deep subpath
imports into another workspace package need an explicit `exports` entry;
`resolveJsonModule` alone isn't enough), which is itself a useful thing to
know for whoever adds the next ABI file here.

**A naming-convention discrepancy was found and flagged (not silently
resolved):** `packages/shared/abi/README.md`'s table names `VeriChainEscrow.json`
as the Team 3 slot, implying the Consumer feature was meant to be built by
filling in `contracts/src/VeriChainEscrow.sol` itself, not by adding new
files. This implementation instead built separately-named
`VeriChainConsumerNFT.sol`/`VeriChainMarketplace.sol`, deployed and verified
under those names. See the README's own note for the two ways to reconcile
this — it's a real open question for whoever owns that slot, not something
this plan should decide unilaterally.

**Verified for real, not just typechecked:** `frontend/scripts/test-consumer-chain-utils.ts`
(`npm run test:consumer-chain-utils`) — 11/11 passed, including three live
reads against the deployed contracts that independently reproduce this
session's manual `cast`-based verification (same buyer, same "Sold"/"Active"
listing states), and one live **write** through this exact module
(`mintConsumerNftOnChain`, real tx hash, independently read back). This is
the first genuinely tested slice of the "real adapter" layer — the rest
(`app/api/consumer/**`, browser wallet signing, Supabase reconciliation) is
still ahead.

---

## Real Hedera testnet deployment record (2026-09-12)

Two new contracts were implemented for real (not stubs, not the reserved
`VeriChainEscrow.sol`/`VeriChainHook.sol` — those remain untouched, per the
protected-areas rule), tested with `forge test`, and deployed live to Hedera
testnet using the operator key already present in `frontend/.env.local`
(same key/account the existing `registry:read`/`registry:create-batch`
scripts use). This record exists so a future session doesn't have to
re-deploy or re-derive these addresses.

**Contracts:** `contracts/src/VeriChainConsumerNFT.sol` (consumer ownership;
identifies a product by the same `bytes32 productIdHash` scheme as
`VeriChainRegistry`, so tokenId ≡ productIdHash — no separate mapping to keep
in sync), `contracts/src/VeriChainMarketplace.sol` (listing + atomic
escrow-in-one-transaction settlement + pull-payment withdrawal; see the
NatSpec at the top of that file for why escrow funding/release aren't split
across multiple transactions).

**Automated tests:** `contracts/test/VeriChainConsumerNFT.t.sol` (14 tests),
`contracts/test/VeriChainMarketplace.t.sol` (19 tests) — **43/43 passed**,
run with a real `forge` binary (Foundry wasn't installed in this environment;
it was fetched from the official `foundry-rs/foundry` v1.8.1 Windows release
to run these for real rather than only compile-checking). `forge test` (no
filter) also re-ran the pre-existing `VeriChainRegistry.t.sol` suite (10
tests) to confirm zero regression — 43 total tests across all three real
suites, 0 failed.

**Deployed to Hedera testnet (chain id 296, via `https://testnet.hashio.io/api`, `--legacy --broadcast`, matching the workaround already documented in `contracts/script/Deploy.s.sol`):**

| Contract | Address | Deploy tx hash | Block |
|---|---|---|---|
| `VeriChainConsumerNFT` | `0xF217e76F80a2743769B3f6D51bE1F1B6C2cC7b49` | `0x4a931ff97ab2b031ce34684ea38a948cd656d77f200d6083853d71be80cd0135` | 40422271 |
| `VeriChainMarketplace` (constructor arg = NFT address above) | `0xCC98075D05c02a7f136ff534bB01C5bE4476da4F` | `0x99b7119b0492405b44028a28906be89b30cfd9df1a3dbbdb2433f09ded541998` | (same deploy batch) |

**Independently verified against the live chain (not just trusted from the CLI's own output):** `cast call` confirms `VeriChainConsumerNFT.owner()` and
`VeriChainMarketplace.owner()` both resolve to the deployer
(`0x62a7181bC3c4a6894D59E600239db714b4E1A7F9`), `VeriChainMarketplace.nft()`
correctly cross-references the NFT address, `cast code` returns non-zero
bytecode at both addresses, and `cast receipt` on the NFT deploy tx shows
`status: 1 (success)`.

**Live behavioral round-trip also verified on this deployed instance** (not
just the local Foundry test run) — minted a real test product
(`keccak256("VC-TESTNET-DEPLOY-VERIFY-0001")`) to the operator address,
confirmed `ownerOf` returns it, called `setApprovalForAll` on the NFT for the
marketplace, `createListing` (price `1e12` — a nominal test value), read the
listing back (`status = Active`), then `cancelListing` and read it back again
(`status = Cancelled`). Every one of those five calls is a real, separately
mined Hedera testnet transaction with `status: 1 (success)` — transaction
hashes: mint `0x2cff17b7e924c9b0465a554b8a8078882eaa71f67b7f9d89960518fad6633c00`,
approval `0xda65f42501445142280473ad4ced863bfd84f316b7cf684dae0359fc927d21a3`,
listing `0x94503d1c865d5da87ee48ff98b86b6bc500cb84c18e841616082598a0ecbf3d4`,
cancel `0x7ab32c7a8e46d90ed8c849e1b8debfe47c26e8bb9e8216f463459b6041ff178e`.

**Update — the two/three-party flow above WAS subsequently verified live**, in
a second pass, using four freshly generated throwaway testnet keys (seller,
buyer1, buyer2, stranger — funded with 5 test-HBAR each from the operator
account, not real value, generated locally with `cast wallet new`). Every one
of these is a real, separately-mined Hedera testnet transaction, independently
re-read afterwards via `cast call` (not just trusted from `cast send`'s own
success message):

| Scenario | Result | Real tx hash |
|---|---|---|
| Unauthorized `transferFrom` by a non-owner/non-approved stranger | Reverted (`NotOwnerOrApproved`) | rejected pre-broadcast by gas estimation |
| Unauthorized `cancelListing` by a non-seller stranger | Reverted (`Unauthorized`) | rejected pre-broadcast by gas estimation |
| Real two-wallet purchase: seller lists, buyer1 buys, NFT ownership verified via `ownerOf`, seller `pendingWithdrawals` credited, seller `withdraw()` paid out (seller's real balance increased on-chain) | **Succeeded end-to-end** | buy `0x51c8dbd9…88fcd9d`, withdraw `0xc8fd6530…9fb78d652` |
| Double-buy race: buyer1 and buyer2 submit `buy()` for the *same* listing concurrently (backgrounded shell processes, not sequential) | Exactly one succeeded (buyer1, tx `0x51c8dbd9…`), the other genuinely reverted on-chain (`status: 0`, tx `0x7bccaf98…`) — contract state decided it, not an off-chain lock | both hashes above/below |
| Blocked product (`setProductBlocked(true)`, simulating an authorized `SUSPECT_COUNTERFEIT` sync): buyer attempts to buy anyway | Reverted (`ProductIsBlocked`); listing stayed `Active`, NFT never moved | blocked-set `0xb57d9a7e…b392d`, failed buy `status 0` |

**A real, non-obvious Hedera integration finding surfaced during this testing
— any future adapter must account for it:** a plain `cast send ... --value
2000000000000000000` (2 HBAR expressed the normal 18-decimal way) arrived at
the contract as `msg.value == 200000000` (2 × 10⁸) instead of `2 × 10¹⁸`.
**Hedera's EVM delivers `msg.value` to a contract in tinybar units (8
decimals), not the 18-decimal "weibar" figure standard EVM tooling sends as
the transaction's value field.** A contract comparing `msg.value` against a
price must have that price expressed in the same tinybar-scale units the
contract will actually observe — this repo's `VeriChainMarketplace.buy()`
does the comparison correctly, but **any off-chain adapter/UI that lets a
user enter "20 HBAR" must convert it to tinybar units (×10⁸, not ×10¹⁸)
before comparing it to or reconstructing a listing's on-chain `price`,** and
must clearly label amounts so this unit is never silently mixed up with a
normal EVM chain's wei convention. Separately: **Hedera's `eth_estimateGas`
under-provisions gas for this contract's `buy()` path** — the first live
attempt failed with Hedera's own `INSUFFICIENT_GAS` system revert even though
the contract logic was correct; every write in this test pass needed an
explicit `--gas-limit` (500000 for `buy`, 200000 for simpler calls) rather
than relying on automatic estimation. **The real adapter (Phase 2/7) must
hardcode a safe explicit gas limit per contract method, not trust
`estimateGas` on Hedera.**

**What this does and does not mean:** the smart-contract layer described in
Phases 1–3's "Architecture correction" is now real, deployed, and partially
live-verified. **None of the backend (`app/api/consumer/**`), the adapters
that would call these contracts from Node (`lib/consumer/adapters/*`), wallet
signing in the browser, or the reconciliation worker exist yet** — those are
still exactly as scoped in Phases 2, 4, 5, and the "Architecture correction"
section above. Wiring the existing mock `TransferFlow`/`ResellForm`/
`ListingDetail` UI to these real addresses through a real adapter is the next
concrete phase, not something to infer as "basically done" from the contracts
being deployed.

**Env vars now needed** (not yet added anywhere, since no adapter consumes
them yet): `NFT_CONTRACT_ADDRESS=0xF217e76F80a2743769B3f6D51bE1F1B6C2cC7b49`,
`MARKETPLACE_CONTRACT_ADDRESS=0xCC98075D05c02a7f136ff534bB01C5bE4476da4F`,
`HEDERA_CHAIN_ID=296` — server-only until a real adapter needs to expose any
of them to the client, per the master prompt's `NEXT_PUBLIC_*` rule.

---

## Changelog

- 2026-09-12 — initial plan written; grounded against real schema/auth code as
  of this date (see file paths cited throughout). Re-verify assumptions in
  Phase 0 before implementing if significant time has passed.
- 2026-09-12 (later same day) — added the "Architecture correction —
  blockchain-first, asynchronous backend reconciliation" section (supersedes
  transaction-ordering details in Phases 2/3/6/7/10) and the real Hedera
  testnet deployment record above. Contracts + tests are real and verified;
  backend/adapter/frontend wiring to them is still not implemented.
- 2026-09-12 (later still) — live two/three-wallet on-chain verification
  completed: real purchase, real double-buy race, real blocked-product
  rejection, real unauthorized-transfer/cancel rejections, all against the
  deployed contracts with fresh throwaway testnet wallets. Documented the
  Hedera `msg.value` tinybar-scaling quirk and the `eth_estimateGas`
  under-provisioning issue that any real adapter must handle. Backend
  (`app/api/consumer/**`), adapters (`lib/consumer/adapters/*`), browser
  wallet signing, and frontend wiring are still entirely unbuilt — this
  remains scoped as the next phase, not something to infer as done.
- 2026-09-12 (later still) — ran the mandatory supply-chain compatibility
  audit (see section above): found and documented a real `products.token_id`
  ambiguity, confirmed no existing code references `resale_listings`/
  `ownership_records`/`escrows` yet (greenfield, low collision risk today),
  corrected Phase 1's `resale_settlements` migration draft to drop an
  inappropriate FK to the org-scoped `escrows` table, and confirmed
  `SUSPECT_COUNTERFEIT` has no existing setter anywhere in this repo yet.
  Then built the shared, tested Hedera transaction utility this session's
  `msg.value`/gas findings called for, by extending the existing
  `services/hedera` package rather than creating a parallel one — see
  "Shared Hedera transaction utility" section above. `lib/consumer/adapters/*`,
  `app/api/consumer/**`, browser wallet signing, and Supabase reconciliation
  remain unbuilt.
