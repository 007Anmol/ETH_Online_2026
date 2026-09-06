# VeriChain

Physical product → NFC tag → on-chain identity (Hedera testnet).

## Who owns what

| Team | App (source of screens) | Chain | Types |
|---|---|---|---|
| **1 identity** | `frontend/lib/manufacturing`, `frontend/lib/nfc`, `frontend/app/api/batches`, `frontend/app/api/nfc` | `contracts/src/VeriChainRegistry.sol`, `services/hedera` | `packages/shared/types/manufacturing.ts`, `nfc.ts` |
| **2 supply chain** | later | `VeriChainHook.sol` | `supply-chain.ts` |
| **3 ownership / escrow** | later | `VeriChainEscrow.sol`, `services/hedera/src/payments.ts` | `ownership.ts` |

## Run the app

```bash
cd frontend
cp .env.example .env.local   # add Supabase + Hedera operator
npm install
npm run dev
```

Hedera operator keys stay in `.env.local` (gitignored). Never `NEXT_PUBLIC_`.
