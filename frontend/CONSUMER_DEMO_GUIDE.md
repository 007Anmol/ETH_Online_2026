# VeriChain Consumer — Demo Guide

Everything below runs against **real Hedera testnet contracts** — every transaction shown in
this demo is a genuine, wallet-signed, on-chain transaction (not a simulation), verified
independently by re-reading contract state after each step (never just trusting the client).

## Before you demo: setup checklist

- [ ] Two MetaMask accounts imported, both with **Hedera Testnet** added:
  - Network name `Hedera Testnet`, RPC `https://testnet.hashio.io/api`, Chain ID `296`,
    Currency `HBAR`, Explorer `https://hashscan.io/testnet`
  - Both accounts funded with testnet HBAR (faucet: https://portal.hedera.com/faucet — needs
    the `0x...` EVM address, not a Hedera account ID)
- [ ] Dev server running: `cd frontend && npm run dev` → `http://localhost:3000`
- [ ] **Use a real desktop browser with the real MetaMask extension** — not VS Code's Simple
  Browser, not a mobile-emulated DevTools viewport. WalletConnect (phone-pairing) also works but
  adds a phone-in-the-loop step; picking MetaMask's injected/extension option when connecting is
  simpler for a live demo.
- [ ] Each account needs a demo product minted to it beforehand (ask engineering to run the
  seed script for two fresh product codes, or reuse whichever your team already seeded) — a
  product must exist and be owned by "Wallet A" before the transfer/resale demos below.

## Page map (what's in the navbar, and what each page is)

| Nav label | Route | What it shows |
|---|---|---|
| Home | `/consumer` | Marketing-style landing page — scan CTA, trust explainer, demo catalog preview. Not part of the real-Hedera demo. |
| My products | `/consumer/products` | **Real Hedera products** your connected wallet owns, each with Transfer / Resell / Report buttons. Also shows a "sale proceeds" withdraw card when you have money to claim. |
| Marketplace | `/consumer/hedera-marketplace` | Public browse page for active resale listings + a live animated explainer of how the atomic escrow works. |
| Activity | `/consumer/activity` | A feed of every real transfer/resale your connected wallet has been part of (as sender, receiver, buyer, or seller), each with a HashScan link. |
| Grievances | `/consumer/hedera-grievances` | List of grievances you've filed. |
| Profile | `/consumer/profile` | Your real connected wallet address + a live count of products it owns. |
| Scan product | `/consumer/scan` | The original NFC/QR scan flow (unrelated to the real-Hedera transfer/resale/grievance work — leave this out of the Hedera demo unless specifically asked). |

Routes not in the navbar but reachable from a product card:
- `/consumer/hedera-transfer/[productId]` — Transfer
- `/consumer/hedera-resell/[productId]` — Resell (create listing)
- `/consumer/hedera-marketplace/[productId]` — Listing detail (buy / cancel)
- `/consumer/hedera-grievances/new/[productId]` — File a grievance for that product
- `/consumer/hedera-grievances/[grievanceId]` — Grievance detail

---

## Demo 1 — Direct Transfer (Wallet A → Wallet B)

**Narrative:** "This is a real product on Hedera testnet. I own it right now — watch me hand
ownership to another wallet with one real blockchain transaction."

1. As **Wallet A**, go to `/consumer/products`
2. Under "Real Hedera testnet products," find your product, click **Transfer**
3. If prompted, click **Connect wallet** (MetaMask connect) then **Sign in with wallet** (a
   plain message signature — no gas, proves you control the wallet)
4. Enter **Wallet B's** address in the recipient field, click **Transfer**
5. Narrate the animated step tracker as it moves through:
   - **Validate ownership** — backend checks you actually own it before anything is signed
   - **Sign in wallet** — MetaMask pops up a real transaction to approve; point out it's calling
     the actual Consumer NFT contract (`0xF217e76F80a2743769B3f6D51bE1F1B6C2cC7b49`)
   - **Confirm on Hedera** — waiting for real block confirmation
   - **Verify new owner** — the backend independently re-reads `ownerOf()` on-chain before
     declaring success (never trusts the client)
6. End state: green "Ownership transferred" + a clickable HashScan link — **click it live** to
   show the real transaction on a public block explorer
7. Switch MetaMask to **Wallet B**, refresh `/consumer/products` — the product now shows under
   Wallet B's ownership. This is the "wow" moment: two different wallets, one real transaction,
   verifiable on a public explorer.

**Talking point:** "Nothing here is a database update pretending to be a blockchain transfer —
if I open HashScan, this transaction really exists on the Hedera network."

---

## Demo 2 — Resell via Marketplace (public listing + atomic purchase)

**Narrative:** "Direct transfer is for when you already know who you're giving it to. For a
public resale — like selling to a stranger — we use a real on-chain escrow so neither side can
get cheated."

**Part A — Wallet A lists it for sale**
1. As **Wallet A** (must currently own the product — transfer it back first if needed), click
   **Resell** on the product card
2. Enter a price, e.g. `1` HBAR
3. First-time sellers see one extra step: **Approve marketplace** (a one-time
   `setApprovalForAll` letting the marketplace contract move this NFT on your behalf) — explain
   this is standard NFT marketplace pattern, not unique to VeriChain
4. Then **Sign listing** → **Confirm on Hedera** → **Verify listing**
5. End state: "Listed for sale" + HashScan link

**Part B — the escrow walkthrough (use this while Part A confirms, or before Part C)**
- On `/consumer/hedera-marketplace`, point out the auto-cycling **"How the atomic escrow
  works"** card — it demonstrates the real contract event sequence:
  `EscrowFunded → NFTTransferred → EscrowReleased → SaleCompleted`
- **Talking point:** "This isn't four separate steps a buyer could get stuck between — it's one
  atomic transaction. The buyer's HBAR and the NFT move together, in the same block, or neither
  moves at all."

**Part C — Wallet B buys it**
1. Switch to **Wallet B**, go to **Marketplace** in the nav
2. Your listing should appear — click into it
3. Click **Buy for X HBAR**
4. Tracker: **Validate listing** (price/seller re-read from chain, never trusted from the UI) →
   **Sign purchase** (a real HBAR-value transaction) → **Confirm on Hedera** → **Verify
   ownership**
5. End state: "COMPLETED" + HashScan link. Refresh `/consumer/products` as Wallet B to show the
   product now under Wallet B's ownership.

**Part D — Wallet A withdraws proceeds**
1. Switch back to **Wallet A**, go to `/consumer/products`
2. A **"X HBAR available from sales"** card appears automatically
3. Click **Withdraw** → sign → confirms → Wallet A's real MetaMask HBAR balance increases

**Talking point on the withdraw step:** "The contract uses a pull-payment pattern — the seller's
proceeds sit in escrow until they actively withdraw, rather than being pushed automatically. This
is a deliberate security choice: it means a broken or malicious seller address can never block or
exploit a sale in progress."

---

## Demo 3 — Grievance / Report

**Narrative:** "If a buyer or owner suspects a product is counterfeit, damaged, or has some other
issue, they can file a grievance directly from the product."

1. As whichever wallet currently owns a product, click the small warning-icon **Report** button
   next to Transfer/Resell on that product's card
2. Pick a category (e.g. "Counterfeit suspicion"), write a description, submit
3. Show it appear under the **Grievances** nav link, with a status ("Open")
4. **Privacy/isolation demo (optional but effective):** switch to the *other* wallet, sign in,
   go to Grievances — show that this grievance does **not** appear in their list, and that
   navigating directly to its URL returns not-found rather than leaking the content. This
   demonstrates real per-consumer authorization, not just hidden UI.

---

## Profile section

`/consumer/profile` shows:
- The **real connected wallet address** (copyable) — not a fabricated identity
- A **live count** of real products that wallet owns on-chain (same data source as My Products)
- A **Disconnect wallet** button

**Talking point:** "There's no separate login system here for the real flows — your wallet *is*
your identity. What you see is a live reflection of on-chain state, not a stored profile record."

---

## If something goes wrong mid-demo

- **A step's dot turns red with an error message underneath** — that's a real failure being
  surfaced honestly (a reverted transaction, a rejected signature, a timeout), not a UI bug. Read
  the message aloud; it tells you exactly what happened.
- **MetaMask shows a stuck "Transaction submitted" that never resolves** — Hedera's public
  testnet relay occasionally drops a transaction silently. Recovery: MetaMask → Settings →
  Transactions → "Clear activity tab data" (resets local pending-tx tracking, doesn't touch
  funds/keys), then retry. Have this ready as a rehearsed "even blockchains have off days"
  moment rather than a panic — it's genuinely common on public testnets, not specific to this app.
- **Always have a second, pre-verified product ready** as a fallback in case one specific token
  ends up in an awkward state (already listed, mid-transfer, etc.) right before the demo.
