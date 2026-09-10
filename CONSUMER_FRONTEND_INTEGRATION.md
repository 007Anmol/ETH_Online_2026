# Consumer Frontend — Integration Guide

**Status: frozen for design.** This document is the handoff for replacing the
consumer frontend's mock data layer with real backend/L1/L2/Graph/Hedera/
Privy/World ID integrations. It intentionally does **not** describe a UI
redesign — the UI is done; only the data underneath it changes.

Everything the consumer UI needs from the outside world flows through a
small set of TypeScript interfaces in `frontend/lib/consumer/providers/`.
Every page, component, and hook under `frontend/app/consumer/` and
`frontend/components/consumer/` talks to those interfaces — never directly
to Supabase, GraphQL, an RPC node, a smart contract, or Hedera. Tomorrow's
integration work means writing new implementations of those interfaces and
changing **one file** (`frontend/lib/consumer/providers/index.ts`) to point
at them. No consumer route, component, or hook should need to change.

---

## 1. Consumer routes

| Route | Purpose | Input | Current source (mock) | Future real source | Key UI states | Auth required? |
|---|---|---|---|---|---|---|
| `/consumer` | Home — hero, trust explainer, a live demo verification, owned-products preview | none | `productDataProvider.getProduct/verifyProduct("VC-001024")`, `ownershipProvider.listOwnedProducts()` | Same providers, real implementations | loading, signed-out prompt, populated | No (preview section degrades gracefully when signed out) |
| `/consumer/login` | Consumer sign-in | Google/Email button click | `consumerAuthProvider.login()` | Privy (wallet) + World ID | idle, authenticating, error+retry, already-authenticated redirect | No (this *is* the auth entry point) |
| `/consumer/scan` | Scan or manually enter a product ID; drives the full verify sequence | typed product ID, or `?tag_uid&nonce&cmac` query params (real/simulated NFC tap deep link) | `productDataProvider.getProduct/verifyProduct(id)` for typed IDs; `verifyNfcTapPayload()` (calls the real `POST /api/nfc/verify` via `lib/nfc/client-api.ts`) for tap deep links | Real path already wired for taps; typed-ID path needs `productDataProvider` swapped to a real backend/Graph-backed implementation | idle, reading, identified, verifying, result (4 outcomes), error, cancel | No |
| `/consumer/product/[productId]` | Product identity, verification status, trust summary, manufacturer, claim CTA | `productId` route param | `productDataProvider.getProduct/verifyProduct(id)`, `ownershipProvider.getClaimEligibility(id)` | Backend/Graph-backed product + verification; real ownership service for the claim CTA | not-found, verified/incomplete/suspicious, with/without claim CTA | No (claim CTA itself requires sign-in, enforced on the claim page) |
| `/consumer/product/[productId]/journey` | Supply-chain checkpoint timeline | `productId` route param | `productDataProvider.getJourney(id)` | The Graph (indexed Hedera contract events) via a backend/service layer | empty, populated with completed/current/missing/anomaly checkpoints | No |
| `/consumer/product/[productId]/proof` | Blockchain proof — status, network, tx, technical details | `productId` route param | `productDataProvider.getBlockchainProof(id)` | Contract + The Graph | unavailable, empty, confirmed/pending/unavailable | No |
| `/consumer/product/[productId]/claim` | Claim a verified product into the signed-in user's collection | `productId` route param | `ownershipProvider.getClaimEligibility/claimProduct(id)` | Real ownership backend/contract call | checking, eligible, already-owned, processing, success, failure+retry | Yes (claim itself; page renders without auth but claiming requires it via `consumerAuthProvider`) |
| `/consumer/products` | "My Products" — the signed-in user's verified collection | none | `ownershipProvider.listOwnedProducts()` enriched per-item via `productDataProvider.getProduct()` | Same providers, real implementations | signed-out, loading, error+retry, empty, populated, search/filter, no-results | Yes |
| `/consumer/profile` | Consumer identity, wallet, collection count, sign-out | none | `consumerAuthProvider.getIdentity()`, `ownershipProvider.listOwnedProducts()` (for the count) | Privy identity + World ID verification badge | signed-out, populated (wallet shown only if the identity actually has one) | Yes |

---

## 2. Architecture

```
UI (Server/Client Components under frontend/app/consumer, frontend/components/consumer)
   ↓
Hooks (frontend/lib/consumer/hooks/*.ts)
   ↓
Provider registry (frontend/lib/consumer/providers/index.ts)
   ↓
Typed provider interfaces (frontend/lib/consumer/providers/types.ts)
   ↓
Mock implementations NOW (frontend/lib/consumer/mocks/*.ts)
   ↓
Real backend / L1 / L2 / The Graph / Hedera LATER
```

**The rule that matters tomorrow:** no file under `frontend/app/consumer/`
or `frontend/components/consumer/` imports `@supabase/supabase-js`, a
GraphQL client, `viem`, or anything from `services/hedera/` directly. The
one deliberate exception is the real-tap bridge in
`frontend/lib/consumer/adapters/nfc-tap-adapter.ts`, which calls the
existing, already-real `requestVerify()` from `frontend/lib/nfc/client-api.ts`
— that's the one place the consumer layer already touches a real backend
endpoint (`POST /api/nfc/verify`), by design, for physical/simulated NFC
taps.

Server Components fetch through the providers directly (e.g.
`app/consumer/product/[productId]/page.tsx` calls
`productDataProvider.getProduct()` in an `await`). Client Components go
through a hook first (e.g. `useClaimProduct`, `useProductCollection`,
`useConsumerIdentity`) so loading/error state and re-fetching are handled
once, not per-component.

---

## 3. Provider interfaces and their replacement points

All defined in `frontend/lib/consumer/providers/types.ts`. Wired up in
`frontend/lib/consumer/providers/index.ts` — **this is the only file that
needs to change** to swap mocks for real implementations.

### `ProductDataProvider`
```ts
interface ProductDataProvider {
  getProduct(productId: string): Promise<ConsumerProduct | null>;
  verifyProduct(productId: string): Promise<VerificationRun>;
  getJourney(productId: string): Promise<ProductJourney | null>;
  getBlockchainProof(productId: string): Promise<BlockchainProof | null>;
}
```
- **Mock today:** `frontend/lib/consumer/mocks/mock-product-provider.ts`, backed by the deterministic catalog in `frontend/lib/consumer/mocks/demo-data.ts`.
- **Real tomorrow:** a provider that resolves `getProduct`/`verifyProduct` against the backend/Graph-indexed product+verification record (the existing `frontend/lib/nfc/get-public-product.ts` and the NFC verify flow are the closest existing real analogues, though their ID space — real bound tag UIDs — differs from the consumer demo catalog's `VC-00XXXX` IDs; reconciling that ID space is part of tomorrow's work). `getJourney`/`getBlockchainProof` resolve against The Graph.

### `ConsumerAuthProvider`
```ts
interface ConsumerAuthProvider {
  getIdentity(): Promise<ConsumerIdentity | null>;
  login(method: ConsumerLoginMethod): Promise<ConsumerIdentity>;
  logout(): Promise<void>;
}
```
- **Mock today:** `frontend/lib/consumer/mocks/mock-auth-provider.ts` — in-memory, module-level state (resets on server restart, not per-browser-session; this is a real limitation to fix in the real implementation, not just a swap).
- **Real tomorrow:** Privy for wallet/embedded-wallet auth, World ID for identity verification where required, backed by a real session (the existing manufacturer-side `frontend/lib/session.ts` / `frontend/lib/auth/` stack is the closest existing real analogue — **do not reuse it directly**, it's manufacturer-scoped; build a consumer-scoped equivalent).

### `OwnershipProvider`
```ts
interface OwnershipProvider {
  getClaimEligibility(productId: string): Promise<ClaimEligibility>;
  claimProduct(productId: string): Promise<ClaimResult>;
  listOwnedProducts(): Promise<OwnedProduct[]>;
}
```
- **Mock today:** `frontend/lib/consumer/mocks/mock-ownership-provider.ts` — same in-memory, server-wide caveat as auth above.
- **Real tomorrow:** a real ownership backend/service, ultimately backed by a Layer 1/Layer 2 smart-contract write (see §6).

### NFC adapter (already real, not mocked)
- `frontend/lib/consumer/adapters/nfc-tap-adapter.ts` — `verifyNfcTapPayload()` calls `requestVerify()` (`frontend/lib/nfc/client-api.ts`, unmodified, owned by the NFC/manufacturing team) and maps its `AUTHENTIC/DUPLICATE/INVALID/ERROR` result onto the consumer `VERIFIED/INCOMPLETE/SUSPICIOUS` narrative. This file documents its own mapping rationale in comments. Nothing to build here tomorrow except possibly widening it if the real backend adds richer per-check data.

---

## 4. Real integration mapping

| Current mock | Tomorrow's real source | Replacement location |
|---|---|---|
| Mock product data (`mocks/demo-data.ts`) | Backend/DB, indexed via The Graph | `lib/consumer/providers/index.ts` → new `ProductDataProvider` implementation |
| Mock verification (`mock-product-provider.ts`'s `verifyProduct`) | Existing NFC verification backend (`lib/nfc/verify-tap.ts`, `POST /api/nfc/verify`) for tap-based scans; backend/Graph lookup for ID-based scans | `lib/consumer/adapters/nfc-tap-adapter.ts` (tap path, already wired) + new provider (ID path) |
| Mock journey (`buildJourney()` in `demo-data.ts`) | The Graph, indexing Hedera contract checkpoint events | New `ProductDataProvider.getJourney()` implementation |
| Mock blockchain proof (`buildProof()` in `demo-data.ts`) | Hedera contract (`services/hedera/`, `HEDERA_REGISTRY_ADDRESS`) + The Graph | New `ProductDataProvider.getBlockchainProof()` implementation |
| Mock authentication (`mock-auth-provider.ts`) | Privy + World ID | New `ConsumerAuthProvider` implementation |
| Mock ownership (`mock-ownership-provider.ts`) | Real ownership backend/contract | New `OwnershipProvider` implementation |
| Mock claim (`claimProduct()` in `mock-ownership-provider.ts`) | Real ownership/claim flow, ultimately an L1/L2 write | Same `OwnershipProvider` implementation |
| Mock wallet (`walletAddress` on `ConsumerIdentity`, only ever populated for the unused `WALLET` login method today) | Privy embedded/connected wallet | New `ConsumerAuthProvider` implementation |

---

## 5. Environment variables

**The consumer frontend itself requires zero environment variables of its
own today** — every consumer-scoped file under `lib/consumer/`,
`app/consumer/`, and `components/consumer/` was checked and none read
`process.env` directly; all data comes from the mock providers.

The app as a whole (which the consumer routes run inside) still needs the
variables already documented in `frontend/.env.example` to boot at all —
these are **not** consumer-specific, they're required by the root
`app/providers.tsx` (Privy) and the existing NFC/manufacturer stack
(Supabase) regardless of whether you ever visit a `/consumer/*` route:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NFC_MASTER_KEY                 (optional, has a demo fallback)
HEDERA_TESTNET_RPC_URL
HEDERA_TESTNET_CHAIN_ID
HEDERA_OPERATOR_PRIVATE_KEY
HEDERA_OPERATOR_ADDRESS
HEDERA_OPERATOR_ACCOUNT_ID
HEDERA_REGISTRY_ADDRESS
HEDERA_REGISTRY_CONTRACT_ID
HEDERA_REGISTRY_HASHSCAN_URL
PRIVY_APP_SECRET
NEXT_PUBLIC_PRIVY_APP_ID
NEXT_PUBLIC_WORLD_ID_APP_ID
NEXT_PUBLIC_WORLD_ID_ACTION
WORLD_ID_ACTION
WORLD_ID_RP_ID
WORLD_ID_SIGNING_KEY
```

**FUTURE / NOT CURRENTLY REQUIRED** — no such variables exist in this
repository yet, and none are invented here. When a real `ProductDataProvider`
needs a Graph endpoint, it will need something like a subgraph URL (the
`subgraph/` directory's own deployment will determine the actual variable
name — do not guess one in advance). Add it to `.env.example` when that
provider is actually built, not before.

---

## 6. Authentication integration

**Today:** `LoginPanel` (`components/consumer/login/LoginPanel.tsx`) offers
"Continue with Google" / "Continue with email", both calling
`consumerAuthProvider.login(method)` — the mock always succeeds and returns
a fixed `{ displayName: "Demo Consumer", walletAddress: null }` (or a fixed
demo wallet string for the unused `WALLET` method). Session state lives in
a module-level variable in `mock-auth-provider.ts` — it is **not**
per-browser, it's shared across every request to the same dev server
process until restart. This is fine for a demo, not acceptable as-is for
real auth.

**Tomorrow:**
```
Consumer clicks "Continue with Google" / embedded wallet flow
   ↓
Privy (wallet creation/connection)
   ↓
World ID (where verification is required)
   ↓
Backend session/authorization (new, consumer-scoped — do not reuse
frontend/lib/session.ts, which is manufacturer-scoped)
   ↓
ConsumerAuthProvider.getIdentity() returns the real identity
```
`ConsumerIdentity`'s shape (`{ displayName, loginMethod, walletAddress }`,
in `frontend/lib/consumer/types.ts`) should still be sufficient for the UI
as built — verify this before adding fields the UI doesn't already render.

---

## 7. Blockchain / Graph integration

**Future flow:**
```
Consumer UI (Journey / Proof pages)
   ↓
ProductDataProvider.getJourney() / getBlockchainProof()
   ↓
Backend/service layer
   ↓
The Graph / GraphQL (subgraph/ — schema.graphql, subgraph.yaml)
   ↓
Hedera contract events (services/hedera/, HEDERA_REGISTRY_ADDRESS)
   ↓
Rendered as the existing Journey timeline / Proof chain UI — unchanged
```
The pages designed to consume this are exactly the three that already
render it from mock data:
- `/consumer/product/[productId]` (verification status + trust summary)
- `/consumer/product/[productId]/journey` (checkpoint timeline —
  `computeJourneyDotStates()` in `lib/consumer/journey-progress.ts` derives
  completed/current/missing/anomaly from whatever event array it's given;
  it does not care whether that array came from a mock or The Graph)
- `/consumer/product/[productId]/proof` (proof chain — same story;
  `ProofFlowDiagram` derives its node states from `BlockchainProof.state`,
  whatever populates it)

No UI change should be required here — only the data source.

---

## 8. Ownership / Claim integration

**Today:** mock, in-memory, server-wide (see §6's caveat — same underlying
limitation applies to `mock-ownership-provider.ts`).

**Future flow:**
```
Consumer (signed in via Privy)
   ↓
Backend / ownership service
   ↓
Layer 1 / Layer 2 / smart contract (claim transaction)
   ↓
Ownership confirmation (event or receipt)
   ↓
OwnershipProvider.claimProduct() resolves { status: "SUCCESS" }
   ↓
ConsumerProductPage's claimEligibility flips to ALREADY_OWNED
   ↓
Product appears in /consumer/products via listOwnedProducts()
```
`ClaimPanel` (`components/consumer/claim/ClaimPanel.tsx`) and
`useClaimProduct` (`lib/consumer/hooks/use-claim-product.ts`) already model
every state this real flow needs (`checking → idle → processing →
success/failure`) — no UI change anticipated, only swapping what
`ownershipProvider.claimProduct()` actually does.

---

## 9. What's explicitly NOT done, and is correct to leave undone

- No resale, transfer-ownership, or escrow UI exists anywhere in the
  consumer frontend (checked — see final QA report).
- No real Supabase/GraphQL/RPC/contract call exists in consumer code,
  except the one deliberate NFC-tap bridge described in §3.
- No fabricated blockchain data (hashes, block numbers, wallets, tx
  confirmations) exists outside `lib/consumer/mocks/demo-data.ts`, which is
  clearly a mock module and never presented as real.
