# Consumer App — Running the Project & API Reference

Status snapshot as of 2026-09-12. Use this as the map while building out more consumer UI.

## 1. Running the project

```bash
cd frontend
npm install        # first time only
npm run dev         # Next.js + Turbopack, http://localhost:3000
```

- Dev server is currently running at **http://localhost:3000** (confirmed via `GET /api/health` → `{"ok":true,"service":"verichain-api","phase":1,"supabase":true}`).
- Env vars come from `frontend/.env.local` (already present, not committed — see `.env.example` for the required keys: Supabase URL/keys, Privy, World ID, Hedera operator key).
- Known Windows/Turbopack quirk: if you see `⨯ Another next dev server is already running` or a worker crash (`exit code 0xc0000142`) in `.next/dev/logs/next-development.log`, kill the stale `node.exe` holding port 3000 and delete `.next/` before restarting — a stale Turbopack cache can wedge the `/consumer` route with a 500.
- Other useful scripts (`package.json`): `npm run seed`, `npm run test`, `npm run registry:read`, `npm run supabase:check`.

## 2. Consumer-facing pages (current)

| Route | File | Notes |
|---|---|---|
| `/consumer` | `app/consumer/page.tsx` | Landing/home. **Currently 100% mock data** via `lib/consumer/mock/mock-data.ts` (`listMockOwnedProducts`). No live API call yet. |
| `/consumer/*` layout | `app/consumer/layout.tsx` → `ConsumerShell` | Wraps header (`ConsumerHeader.tsx`) + mobile bottom nav (`MobileBottomNav.tsx`). |
| `/scan` | `app/scan/page.tsx`, `scan-panel.tsx` | NFC tap simulation entry point, calls `/api/nfc/verify` (and `/api/nfc/simulate` in dev). |
| `/product/[id]` | `app/product/[id]/page.tsx` | Server component, calls `getPublicProduct()` directly (not an HTTP call — reads Supabase in-process) to show factory record + recent scan attempts. |
| `/simulator` | `app/simulator/page.tsx` | Manufacturer/dev tool to simulate an NFC tap end-to-end. |
| `/login` | `app/login/page.tsx` | Shared login (Privy + wallet + World ID), used by both manufacturer and consumer flows. |

**Architecture note:** `lib/consumer/providers.ts` defines the intended abstraction — `ProductDataProvider`, `ConsumerAuthProvider`, `OwnershipProvider` interfaces — with only mock implementations (`lib/consumer/mock/*`) wired up today. This is the seam to implement against real data (Supabase + `getPublicProduct` + `verifyTap`) as you build more UI, instead of calling `fetch` ad hoc from components.

## 3. All API routes (`app/api/**/route.ts`)

### Auth

| Method & Path | Purpose | Body | Response |
|---|---|---|---|
| `POST /api/auth/wallet-challenge` | Step 1 of manufacturer login: verifies a Privy access token, extracts the linked ETH wallet, issues a signable challenge message. | `{ privyAccessToken }` | `{ message, walletAddress, ... }` or `401` |
| `POST /api/auth/complete` | Step 2: verifies Privy token + wallet signature + World ID proof together, matches against a registered `MANUFACTURER` profile in Supabase, and sets the session cookie. | `{ privyAccessToken, worldIdProof, walletAddress, walletMessage, walletSignature }` | `{ authenticated, session }` or `4xx` error |
| `POST /api/auth/world-id/context` | Returns World ID app/action config + RP context so the client can render the IDKit widget. | – | `{ app_id, action, rp_context }` |
| `GET /api/auth/session` | Reads the current session from the cookie. | – | `{ session: Session \| null }` |
| `POST /api/auth/logout` | Clears the session cookie. | – | `{ ok: true }` |
| `POST /api/auth/mock-login` | Dev-only bypass: logs in as a demo manufacturer. Disabled unless `ALLOW_TEST_AUTH=true`. | – | `{ session }` or `404` in prod |

> **Note:** all current auth is manufacturer-oriented (World ID + wallet + Privy → role must be `MANUFACTURER`). There is no dedicated consumer login endpoint yet — `lib/consumer/mock/mock-auth-provider.ts` is a stand-in for whatever consumer auth (likely a lighter Privy/email/social flow) gets built.

### Manufacturing / Products (manufacturer-only, `requireManufacturer()` gate)

| Method & Path | Purpose |
|---|---|
| `POST /api/batches` | Create a new production batch (mints product records) for the caller's organization. |
| `GET /api/batches` | List batches belonging to the caller's organization. |
| `GET /api/products?batch_id=&status=` | List products for the org, optionally filtered by batch/status. |
| `POST /api/manufacturing/reconcile` | Reconciles a pending on-chain manufacturing operation (batch create + mint) back into Supabase after confirmation. |
| `GET /api/deploy` | Deploys the `VeriChainRegistry` contract to Hedera testnet using the operator key (infra/setup utility, not a runtime consumer path). |

### NFC (tag lifecycle + verification — this is the consumer-relevant core)

| Method & Path | Auth | Purpose | Body | Response |
|---|---|---|---|---|
| `POST /api/nfc/bind` | Manufacturer | Binds a physical NFC tag UID to a product record. | `{ product_id, tag_uid }` | bind result |
| `POST /api/nfc/revoke` | Manufacturer | Revokes/invalidates a bound tag (e.g. compromised, defective). | `{ tag_id, reason }` | revoke result |
| `POST /api/nfc/verify` | **Public (consumer-facing)** | The core "tap to verify" endpoint. Validates tag UID + nonce + CMAC, consumes the nonce **on-chain first** (Hedera, replay-proof), mirrors it in Supabase, records a `verification_attempts` row, and returns a verdict. | `{ tag_uid, nonce, cmac }` | `{ result: "AUTHENTIC" \| "DUPLICATE" \| "INVALID" \| "ERROR", failure_reason?, product_id?, product_code?, batch_code?, product_name?, product_category?, manufacturing_date?, plant_id?, chain_tx_hash? }` |
| `POST /api/nfc/simulate` | Public (dev tool) | Simulates a legitimate tap for a given `tag_uid`/`product_id` (generates a valid nonce+CMAC) so the `/scan` and `/simulator` pages can be tested without real hardware. | `{ tag_uid?, product_id? }` | simulate payload usable against `/api/nfc/verify` |

### Misc

| Method & Path | Purpose |
|---|---|
| `GET /api/health` | Liveness/readiness probe; reports whether Supabase config is present. |

## 4. Non-HTTP consumer data path

`app/product/[id]/page.tsx` does **not** call an API route — it calls `getPublicProduct(idOrCode)` (`lib/nfc/get-public-product.ts`) directly as a server component, querying Supabase for the product, its batch, bound tag, and last 8 `verification_attempts`. If you build a client-side consumer product page later, you'll either need a new `GET /api/products/[id]` (public) route wrapping this same function, or keep it server-rendered.

## 5. Gaps to close before more consumer UI

1. **No public product lookup API** — only a server-component data call. Add `GET /api/products/[idOrCode]` (public, no `requireManufacturer`) if any new page needs client-side fetching.
2. **`/consumer` home is fully mocked** — swap `listMockOwnedProducts()` for a real `OwnershipProvider` once ownership/claim logic exists server-side.
3. **No consumer identity/auth endpoint** — `mock-auth-provider.ts` and `ConsumerAuthProvider` interface exist, but nothing real backs "sign in as a shopper" (as opposed to manufacturer World ID + wallet flow).
4. **No ownership/claim persistence** — `OwnershipProvider.claimProduct()` has no real implementation or table backing it yet (check `supabase/` migrations before building the UI on top of it).
5. **`chain_tx_hash` / blockchain proof surfacing** — `verifyTap` returns `chain_tx_hash` on success; the `BlockchainProof` type in `lib/consumer/types.ts` is richer (contract address, block number) but nothing populates it yet from a real Hedera read.

## 6. Suggested next steps

- Wire `/consumer` page to real data through the existing `ProductDataProvider`/`OwnershipProvider` interfaces (implement a `SupabaseProductProvider` alongside the mock one, swap via a factory).
- Add a public `GET /api/products/[id]` route for client components that can't do server-side Supabase calls.
- Decide on consumer auth (likely simpler than manufacturer's World ID+wallet — maybe Privy email/social only) and implement `POST /api/consumer/auth/*` accordingly.
- Reuse `/api/nfc/verify` and `/api/nfc/simulate` as-is for any new scan UI — they're already public and consumer-safe.
