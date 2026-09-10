# VeriChain

Physical product → NFC tag → on-chain identity (Hedera testnet).

## Who owns what

| Team | App (source of screens) | Chain | Types |
|---|---|---|---|
| **1 identity** | `frontend/lib/manufacturing`, `frontend/lib/nfc`, `frontend/app/api/batches`, `frontend/app/api/nfc` | `contracts/src/VeriChainRegistry.sol`, `services/hedera` | `packages/shared/types/manufacturing.ts`, `nfc.ts` |
| **2 supply chain** | later | `VeriChainHook.sol` | `supply-chain.ts` |
| **3 ownership / escrow** | later | `VeriChainEscrow.sol`, `services/hedera/src/payments.ts` | `ownership.ts` |

## Run the app (any laptop)

This is a Node.js monorepo, not Python — use **nvm + npm workspaces** instead of a venv.

```bash
# 1. Node 20+ (reads .nvmrc)
nvm install
nvm use

# 2. Install every workspace package into one node_modules (frontend, shared, hedera)
npm run setup

# 3. Start Next.js
npm run dev
```

Open http://localhost:3000

`npm run setup` copies `frontend/.env.example` → `frontend/.env.local` if that file is missing. Add Supabase + Hedera operator keys there. Never prefix operator keys with `NEXT_PUBLIC_`.

Do **not** `cd frontend && npm install` on its own. Next/Turbopack compiles `packages/shared` and `services/hedera` from the repo root, so dependencies must be installed at the root.
