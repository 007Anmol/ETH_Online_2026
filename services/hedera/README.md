# `@verichain/hedera`

Team 1 talks to Hedera **only** through this package.

| File | Owner | Job |
|---|---|---|
| `src/client.ts` | Team 1 | Operator + `sendContractCall` (hash or revert) |
| `src/registry.ts` | Team 1 | create / mint / bind / revoke / consume-nonce |
| `src/payments.ts` | Team 3 | Escrow later. Leave it. |

Frontend API routes import `@verichain/hedera`. Do not add `frontend/lib/hedera`.
Do not use wagmi or browser signing for these writes.
