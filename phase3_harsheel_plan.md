# Phase 3 — Harsheel Track: Manufacturer Identity + Batch/Product Persistence

Scope: **only** the Harsheel vertical (manufacturer auth, ownership, batch/product persistence,
chain/DB consistency, dashboard). Saachi's NFC/verification/AES-CMAC code is out of scope and
will not be touched except at the shared integration points listed at the bottom.

Working agreement for this doc: implement one item (H1, H2, …) at a time. After each item:
run an automated internal test, then walk through a manual test together, report both results,
and wait for explicit approval before starting the next item.

---

## 1. Current state audit (verified against the actual code, not assumptions)

| Area | File(s) | Finding |
|---|---|---|
| Manufacturer login | `frontend/lib/auth/mock-login.ts` | `loginAsDemoManufacturer()` — one click, no wallet signature, no World ID. It looks up a **hardcoded** `DEMO_MANUFACTURER_WALLET` profile and trusts it. This is the mock system Phase 3 must replace. |
| Session | `frontend/lib/session.ts` | Session is a **plain JSON cookie** (`httpOnly`, not signed/HMAC'd). `getSession()` trusts whatever is in the cookie if it parses and has 3 fields. `httpOnly` blocks `document.cookie` JS access but **does not** block a user editing the cookie value directly via browser DevTools → Application → Cookies. There is currently no cryptographic integrity check on the session, so role/org could be forged by hand-editing the cookie. This must be fixed as part of H1/H2 (sign the session, e.g. JWT/HMAC, or move to Supabase Auth-issued tokens). |
| World ID | `services/world/src/verify.ts` | **Completely empty file.** `@worldcoin/idkit` is installed in `frontend/package.json` but there is zero server-side verification implemented. This is greenfield work for H1/H3, not a refactor. |
| Wallet signature | (searched, none found) | No `verifyMessage`/SIWE/signature-check code exists anywhere in the repo yet. Also greenfield. |
| `POST/GET /api/batches` | `frontend/app/api/batches/route.ts` | Only checks `session.organizationId` is truthy — **does not check `session.role === 'MANUFACTURER'`**. Any authenticated profile with an org (even a non-manufacturer role, if one existed) could create/list batches today. This is exactly the "backend must verify role, not just presence of a session" gap H2 needs to close. |
| Chain/DB consistency | `frontend/lib/manufacturing/create-batch.ts` (lines 95–163) | Chain writes (`createBatchOnChain`, `mintBatchOnChain`) happen **before** DB writes — correct "golden write" order, matches Phase 2 scorecard. **But**: if the DB insert fails *after* a successful chain tx, the function returns `{ ok: false, status: 500 }` with only a string message — **the chain tx hash is not persisted anywhere and there is no reconciliation/retry mechanism.** This directly violates the Phase 3 requirement "must not pretend the operation failed on chain" — right now it effectively does present it as a failure to the caller, and the successful on-chain tx becomes orphaned/unrecoverable from the DB. This is real Phase 3 work (H6), not already solved. |
| Manufacturer ↔ batch ownership | `frontend/app/api/batches/route.ts` | Batches are scoped by `session.organizationId` (from the unsigned cookie above) — so ownership enforcement today is only as strong as the session's integrity, which is the weak point flagged above. Once the session is signed/verified (H1/H2), this scoping becomes trustworthy; it should not need a redesign. |
| Dashboard | `frontend/app/manufacturer/*` | Not yet fully audited — will confirm during H7 that it reads from `/api/batches` & `/api/products` (backend) and not from client-only state. |

**Net conclusion:** Phase 1/2 (mock auth, on-chain batch/product creation, chain-first write
order) are solid and already verified per `phase_2_scorecard.md` and `slice_4_results.md`. Phase 3
is not a "harden existing auth" task — real auth (World ID + wallet signature + signed sessions)
does not exist yet and must be built from zero. The role-check gap on `/api/batches` and the
missing chain/DB reconciliation path are the two concrete "breaking" issues found so far that
Phase 3 must fix.

---

## 2. World ID credentials status

- `NEXT_PUBLIC_WORLD_ID_APP_ID`, `WORLD_ID_ACTION`, `WORLD_ID_RP_ID` — added to `frontend/.env.local`.
- `WORLD_ID_SIGNING_KEY` — left **blank** in `.env.local`. A previously-pasted signing key was
  exposed in chat and must be treated as compromised; rotate it in the Developer Portal and add
  the new value to `.env.local` directly (never in chat) before H1/H3 implementation begins.

---

## 3. Harsheel's Phase 3 items (build order)

- **H1 — Real manufacturer authentication.** Replace `mock-login.ts` with: World ID selfie-check
  proof → backend verify via World ID API → wallet signs a challenge → backend verifies signature
  → backend looks up/creates the manufacturer profile → backend issues a **signed** session.
  Frontend never decides the role.
- **H2 — Backend manufacturer authorization.** Every privileged endpoint (starting with
  `/api/batches`) must check `session.role === 'MANUFACTURER'` server-side, not just session
  presence. Add a direct-API-call test (no browser) proving a forged/missing role is rejected.
- **H3 — Wallet signature verification.** Valid/invalid/replay tests server-side; replay
  protection via nonce/challenge tied to the auth attempt.
- **H4 — Manufacturer → batch ownership.** Confirm org-scoping is correct once session is signed;
  test cross-manufacturer access is rejected including forged IDs/direct API calls.
- **H5 — Persistent batch/product state.** Confirm survival across refresh/restart/logout — likely
  already works given Supabase persistence, needs verification not a rebuild.
- **H6 — Chain/DB consistency.** Fix the gap found above: on-chain success + DB failure must not
  read as "operation failed" — persist the orphaned tx hash somewhere reconciliable and add a
  recovery mechanism.
- **H7 — Manufacturer dashboard persistence.** Confirm dashboard reads backend data, not stale
  frontend state.
- **H8 — Acceptance test.** Full authenticated-manufacturer → real on-chain batch → survives new
  session, end to end.

## 3a. Pre-H1 gate audit (read-only, completed)

**1. Session forgery — confirmed exploitable.** `frontend/lib/session.ts` stores the session as
plain `JSON.stringify()` in an `httpOnly` cookie with no HMAC/signature. `httpOnly` only blocks
`document.cookie` JS access, not a human editing the raw cookie value via DevTools → Application →
Cookies. No `frontend/middleware.ts` exists — there is no edge-level gate at all. Verdict: a user
can currently forge `role`/`organizationId`/`walletAddress` by hand-editing the cookie, and every
route that only checks truthiness (all of them today) will accept it.

**2. No reusable auth infra exists.** No `jsonwebtoken`/`jose` installed, no `supabase.auth.*`
usage anywhere (app writes only via the Supabase **service-role** key, bypassing Supabase Auth
and RLS entirely). `@worldcoin/idkit` is installed but completely unused/unconfigured. Phase 3
session signing must be built from scratch — simplest fit: HMAC-sign the cookie payload using
Node's built-in `crypto` (no new dependency), rather than pulling in a JWT library.

**3. Shared `getSession()` consumers mapped** — Harsheel-track: `app/api/batches`,
`app/api/products`, all `app/manufacturer/*` pages. Saachi-track: `app/api/nfc/bind`,
`app/api/nfc/revoke`, `lib/nfc/actor.ts`. Shared: `app/layout.tsx`, `components/nav.tsx`,
`app/api/auth/session/route.ts`. **Constraint for H1: the session object's field names/shape
(`walletAddress`, `role`, `profileId`, `organizationId`, `displayName`) must stay unchanged** —
only *how* it's created/verified changes (signed instead of raw) — so Saachi's code keeps working
untouched.

**4. Identity model is already Phase-3-ready.** `profiles.world_id_verified` and
`profiles.world_id_nullifier_hash` (unique) already exist in the schema
(`0003_identity_and_access.sql:20-21`) — no new tables needed. `profiles.wallet_address` is
globally unique and `organization_id` is a single FK, so one wallet = exactly one org, cleanly.
**RLS (`0007_rls.sql`) enforces almost nothing** (one anon-read policy on `products` only,
intentionally, per its own header comment) — real ownership enforcement must live in application
code (route handlers), not the database. This raises the stakes on H2/H4.

**5. Wallet signing: no dependency needed for verification.** `viem@^2.56.3` is already installed
and includes `verifyMessage`/`recoverMessageAddress` — server-side signature verification needs
no new package regardless of wallet provider. `wagmi.ts` is an empty stub; no wallet-connect
library exists on the frontend yet. **Decision (made): Privy**, not raw `window.ethereum` and not
`wagmi` directly — chosen because it supports embedded wallets (email/social login, no extension
required) alongside external wallets like MetaMask, which suits a demo/judge context. Hedera
testnet (chain ID 296) will be configured as a custom EVM chain in Privy. Server-side signature
verification is unaffected by this choice — a Privy wallet still produces a standard EVM
signature, verified the same way via viem.

**6. World ID: `@worldcoin/idkit@^4.2.3` installed, zero config anywhere** — no App ID/Action/RP ID
previously existed in `constants.ts` or `.env.example` (now added to `.env.local`, see §2 above).

**7. Full privileged-endpoint audit** — confirms `/api/batches` and `/api/products` check only
session presence, not role. Additionally found: **`/api/deploy/route.ts` has zero auth check at
all** — anyone hitting that URL can trigger a real contract redeploy using the Hedera operator
key. This is outside the Harsheel H1–H8 list and will not be touched without explicit sign-off,
but is flagged here since it's a live hole, not a hypothetical one.

**8. H6 reconciliation table already exists.** `manufacturing_operations`
(`0004_team1_manufacturing.sql:103-115`) has exactly the right columns (`chain_tx_hash`, `status`,
`error_message`, `operation_type` incl. `CREATE_BATCH`/`MINT_BATCH`) but is **never inserted into
anywhere in the codebase**. H6 reuses this table — no new table needed.

---

## 4. Shared integration points (not to be redesigned unilaterally)

`manufacturer_org_id` on batches/products, the `profiles`/organization tables, and the session
shape are shared with Saachi's track. Changes to the session's fields (e.g. adding signed-token
fields) will be communicated before merging since Saachi's NFC bind/verify code also calls
`getSession()`.
