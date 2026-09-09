# VeriChain app

One Next.js app. Use Node 20+.

Team 1 app code: `lib/manufacturing`, `lib/nfc`, `app/api/batches`, `app/api/nfc`.
Hedera client: `@verichain/hedera` (`../services/hedera`). See the repo root README for the full map.

```bash
cp .env.example .env.local   # add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm install
npm run supabase:check
npm run seed
npm run dev
```

Open http://localhost:3000
