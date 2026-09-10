# VeriChain app

One Next.js app. Use Node 20+.

Team 1 app code: `lib/manufacturing`, `lib/nfc`, `app/api/batches`, `app/api/nfc`.
Hedera client: `@verichain/hedera` (`../services/hedera`). See the repo root README for the full map.

From the **repo root** (not this folder):

```bash
nvm install && nvm use    # Node 20+ from .nvmrc
npm run setup             # installs all workspace deps
npm run dev
```

Open http://localhost:3000

Optional checks (still from repo root):

```bash
npm run supabase:check --workspace=frontend
npm run seed --workspace=frontend
```
