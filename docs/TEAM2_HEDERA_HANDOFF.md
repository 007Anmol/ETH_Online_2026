# Team 2 Handoff — Hedera + Agent (post-Anvil)

Paste this into a new Cursor chat as project context.

## Who / what

- Repo: `C:\Users\dines\Desktop\verichain`
- Branch: `supplychain` (Team 2 supply-chain module)
- Next.js app lives in `frontend/` (NOT `apps/web`)
- Partner focus: The Graph, Hedera + x402, Uniswap v4 (World is backup)

## Architecture split (important)

| Layer | Contract | Role |
|-------|----------|------|
| Team 1 identity | `contracts/src/VeriChainRegistry.sol` | `createBatch`, `mintBatch`, `bindTag`, `revokeTag`, `consumeNonce` (owner-only). IDs = `keccak256(utf8)` |
| Team 2 logistics | `contracts/src/VeriChainSupplyChain.sol` | `registerLogisticsProduct`, shipments, checkpoints, anomalies, `getProductStatus(uint256)` |
| Team 2 escrow | `contracts/src/VeriChainEscrow.sol` | create / `freezeEscrowPool` / resolve / release; reads status from **SupplyChain**, not Team 1 Registry |
| Team 2 hook | `contracts/src/VeriChainHook.sol` | Uniswap v4 settlement gate (optional for first Hedera dry-run) |

Canonical hash helpers: `frontend/lib/blockchain/hashes.ts`  
`deriveOnChainId(value)` = `keccak256(stringToBytes(value))`  
Nonce: `deriveOnChainId(`${normalizedTagUid}:${nonce}`)`

## What already works (Anvil dry-run DONE)

1. Team 1 Registry deploy + createBatch / mint / bindTag / verification UI shows **bound**
2. Team 2 SupplyChain + Escrow deployed against Team 1 identity
3. Shipments: register logistics product → create → accept
4. Checkpoints agent path: risk rules → recordCheckpoint → anomaly → freezeEscrowPool
5. Fixes already applied:
   - Next.js `NEXT_PUBLIC_*` must use **static** `process.env.NEXT_PUBLIC_...` (not `process.env[name]`)
   - Permission checks via `/api/auth/wallet-access` (service role) because RLS blocks anon on profiles
   - Agent checkpoint column is `chain_tx_hash` (not `tx_hash`)
   - Agent returns `findings` / `explanation` / `level` to UI
   - Logistics product id maps via `products.token_id` in Supabase
   - Wallet badge hydration gated with `mounted`

## Key frontend paths

- `frontend/lib/blockchain/` — Team 1 wagmi/clients/contracts/hashes/registry
- `frontend/lib/supabase/` — client singleton, auth permission helpers, Team 2 records
- `frontend/lib/team2/legacySupplyChainAbi.ts` — Team 2 ABI
- Pages: `/manufacturing`, `/verification`, `/shipments`, `/checkpoints`, `/escrow`
- Agent: `services/agent/src/{agent,viemBlockchain,supabase,gemini}.ts`
- API: `frontend/app/api/checkpoints/route.ts`, `frontend/app/api/auth/wallet-access/route.ts`

## Deploy scripts

```bash
# Team 1
cd contracts
forge script script/Deploy.s.sol --rpc-url $HEDERA_RPC --broadcast --private-key $PK

# Team 2 (needs TEAM1_REGISTRY_ADDRESS)
set TEAM1_REGISTRY_ADDRESS=0x...
forge script script/DeployTeam2.s.sol --rpc-url $HEDERA_RPC --broadcast --private-key $PK
```

Owner of Team 1 + Team 2 + agent key should be the **same** EVM account so `onlyOwner` anomaly/freeze works.

## NEXT GOAL — Hedera testnet + real AI agent

### A. Network / wallet

- Chain ID: `296` (Hedera testnet)
- RPC: `https://testnet.hashio.io/api`
- Mirror: `https://testnet.mirrornode.hedera.com`
- Fund deployer/agent with testnet HBAR
- MetaMask: add Hedera Testnet 296

### B. `frontend/.env.local` target shape

```env
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_HEDERA_CHAIN_ID=296
NEXT_PUBLIC_HEDERA_RPC_URL=https://testnet.hashio.io/api
NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL=https://testnet.hashio.io/api

NEXT_PUBLIC_REGISTRY_ADDRESS=0x...   # Team 1 on Hedera
NEXT_PUBLIC_SUPPLY_CHAIN_ADDRESS=0x...
NEXT_PUBLIC_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_HOOK_ADDRESS=0x000...    # optional for first pass

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

HEDERA_NETWORK=testnet
HEDERA_CHAIN_ID=296
HEDERA_RPC_URL=https://testnet.hashio.io/api
HEDERA_AGENT_PRIVATE_KEY=0x...       # MUST be supply-chain + escrow owner
SUPPLY_CHAIN_ADDRESS=0x...
ESCROW_ADDRESS=0x...
REGISTRY_ADDRESS=0x...               # agent logistics writes; prefer SUPPLY_CHAIN_ADDRESS

# Real AI enrichment (optional but requested)
GEMINI_API_KEY=...
```

Notes:
- `wagmi` treats `local` / `31337` / localhost RPC as Anvil; for Hedera use `testnet` + 296.
- Agent uses `SUPPLY_CHAIN_ADDRESS` if set, else `REGISTRY_ADDRESS`.
- Gemini: if `GEMINI_API_KEY` set, `enrichRiskWithGemini` enriches explanation/findings but **cannot lower** deterministic score; freeze still driven by rules (`shouldFreeze` / score ≥ 61).

### C. Hedera dry-run sequence (same as Anvil)

1. Deploy Team 1 → set `NEXT_PUBLIC_REGISTRY_ADDRESS`
2. Deploy Team 2 with `TEAM1_REGISTRY_ADDRESS` → set supply + escrow envs
3. Restart `npm run dev`
4. Seed manufacturer profile for deployer wallet (orgs/profiles/role_permissions)
5. Manufacturing: createBatch / mint / bindTag
6. Supabase: `UPDATE products SET token_id = 1 WHERE product_code = '<minted>';`
7. Shipments: register logistics product `1` with that product code
8. Create escrow for product `1`
9. Checkpoints: impossible velocity Mumbai → New York
10. Confirm freeze + Gemini explanation text in UI

### D. Still pending (not required for first Hedera agent demo)

- Uniswap v4 hook deploy on Hedera
- The Graph subgraph (empty scaffold)
- NFC real verify / `consumeNonce` backend
- World ID
- x402 paid telemetry polish

## Known pitfalls

- Anvil state is wiped on restart — Hedera addresses persist
- RLS: do not read profiles from browser anon; use `/api/auth/wallet-access`
- Checkpoint DB requires `products.token_id` matching logistics uint id
- Escrow/release/anomaly owner = agent private key account
- Do not point Team 2 escrow at Team 1 Registry (no `getProductStatus`)

## Ask for the next chat

Configure and execute Team 2 end-to-end on **Hedera testnet**: redeploy Team 1 + Team 2, update env, enable `GEMINI_API_KEY` for agent explanations, and verify checkpoint → anomaly → `freezeEscrowPool` with real AI enrichment.
