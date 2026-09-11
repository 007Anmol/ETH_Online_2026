## Production Architecture

VeriChain uses Hedera as its only production blockchain. The Solidity registry,
escrow, and hook contracts run on Hedera EVM. The browser connects through a
Hedera-compatible EVM wallet, while the backend agent uses a dedicated Hedera
EVM operator account through the Hedera JSON-RPC relay.

Supabase stores queryable application records and idempotency state. The Hedera
Mirror Node verifies HBAR payments and supplies indexed transaction evidence.
The frontend never receives operator keys; contract addresses and public RPC
settings are `NEXT_PUBLIC_*` values, while agent keys and Supabase service keys
remain server-only.

Local Anvil is not part of the production architecture. Hedera testnet is the
pre-production environment and Hedera mainnet is the production environment.

## Data Flow

1. A manufacturer connects a Hedera-compatible wallet.
2. The frontend submits registry and escrow transactions to Hedera EVM.
3. The frontend/API writes transaction references and operational records to Supabase.
4. Checkpoint telemetry is evaluated by the agent.
5. High-risk telemetry causes the agent operator to record an anomaly and freeze escrow on Hedera.
6. Consumer verification uses an x402 HBAR payment verified against the Mirror Node.
