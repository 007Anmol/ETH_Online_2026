# ABI snapshots

`forge build` output for the app and subgraph.

| File | Team |
|---|---|
| `VeriChainRegistry.json` | 1 — identity |
| `VeriChainHook.json` | 2 (still an empty stub contract — no ABI entries) |
| `VeriChainEscrow.json` | 3 (still an empty stub contract — no ABI entries) |
| `VeriChainConsumerNFT.json` | 3 — consumer ownership (see note below) |
| `VeriChainMarketplace.json` | 3 — consumer resale + escrow (see note below) |

**Naming-convention note (found 2026-09-12, flagging rather than silently
resolving):** this table's original row names `VeriChainEscrow.json` as
"Team 3", implying the Team 3 feature was meant to be built by filling in
`contracts/src/VeriChainEscrow.sol` itself. The actual Consumer
transfer/resale implementation (see `frontend/CONSUMER_BACKEND_PLAN.md`) was
instead built as two new, separately-named contracts —
`VeriChainConsumerNFT.sol` and `VeriChainMarketplace.sol` — and deployed live
to Hedera testnet under those names, because at the time of writing
`VeriChainEscrow.sol`/`VeriChainHook.sol` were empty one-line stubs with no
indication of what shape was expected inside them, and overwriting a
"reserved" file without that context seemed riskier than adding new,
clearly-scoped ones. **This is a decision for whoever owns the Team 3 slot to
reconcile** — either treat `VeriChainConsumerNFT`/`VeriChainMarketplace` as
the real implementation and update this table's row for `VeriChainEscrow.json`
accordingly (or remove it if it's superseded), or there was a different,
narrower design already planned for `VeriChainEscrow.sol` that this
implementation should be reconciled with instead of running alongside.

Frozen testnet registry (chain id 296):

- EVM: `0xd01d7972cD8B14B28b61e1e4709227923A3b464b`
- Hedera: `0.0.10394090`
- HashScan: https://hashscan.io/testnet/contract/0.0.10394090
- Constants: `@verichain/shared` (`HEDERA_REGISTRY_ADDRESS`)
