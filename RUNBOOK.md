# VeriChain Local Runbook

This document covers the complete local flow: starting the services, creating a batch, binding an NFC tag, verifying a product, testing replay protection, revoking a tag, and checking Graph indexing.

## Requirements

- Windows with Docker Desktop running
- Node.js `>=20.9.0`
- npm
- A configured Supabase project
- Hedera testnet operator credentials
- Privy and World ID credentials for manufacturer login

Do not commit `frontend/.env.local` or paste private keys into source control.

## 1. Install and configure

From PowerShell:

```powershell
cd C:\Users\sunid\Downloads\ETH_Online_2026
npm run setup
```

The setup script installs the workspace dependencies and creates `frontend/.env.local` from `frontend/.env.example` if it does not already exist.

Check `frontend/.env.local` and fill in or rotate the required values:

- Supabase URL and service-role key
- Hedera operator address and private key
- Privy app credentials
- World ID credentials
- `SESSION_SECRET`
- `GRAPH_URL=http://localhost:8000/subgraphs/name/verichain`

Keep the service-role key and private key server-only. Do not prefix them with `NEXT_PUBLIC_`.

## 2. Start Docker services

Graph Node uses Graph Node, IPFS, and PostgreSQL. Start all three from the repository root:

```powershell
cd C:\Users\sunid\Downloads\ETH_Online_2026

docker compose -f subgraph\graph-node\docker-compose.yaml up -d
```

Check status:

```powershell
docker compose -f subgraph\graph-node\docker-compose.yaml ps
```

Expected services:

```text
graph-node   Up
ipfs         Up
postgres     Up
```

The compose file includes explicit DNS servers because Graph Node must resolve the Hedera RPC from inside Docker.

## 3. Build and deploy The Graph subgraph

Open a terminal for subgraph commands:

```powershell
cd C:\Users\sunid\Downloads\ETH_Online_2026\subgraph

npm install
npm run codegen
npm run build
npm run create-local
npm run deploy-local
```

Expected deployment result:

```text
Deployed to http://localhost:8000/subgraphs/name/verichain/graphql
```

The current contract address and indexing start block are in `subgraph/subgraph.yaml`. The start block must exist on Hedera testnet.

Check Graph indexing progress:

```powershell
$body = '{"query":"{ _meta { block { number } } }"}'

Invoke-RestMethod `
  -Uri http://localhost:8000/subgraphs/name/verichain `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Wait until the indexed block is at or beyond the subgraph start block. A successful deployment can still return zero entities while indexing is catching up.

## 4. Start the frontend

Open a second terminal and leave it running:

```powershell
cd C:\Users\sunid\Downloads\ETH_Online_2026
npm run dev
```

Open:

```text
http://localhost:3000
```

The root workspace command delegates to the frontend workspace. You can also run `npm run dev` from `frontend` directly.

## 5. Manufacturer login

Open `/login`.

1. Click `Connect manufacturer wallet`.
2. Approve the Privy wallet connection.
3. Click `Verify with World ID`.
4. Complete the World ID verification.
5. Approve the wallet signature challenge.

Successful authentication redirects to `/manufacturer`.

If authentication is not configured, public pages such as `/scan` may still be available, but manufacturer-only actions require a valid manufacturer session.

## 6. Create a batch and mint products

Open:

```text
/manufacturer/batches/create
```

Enter:

- Product name, for example `Demo Watch`
- Unique batch code, for example `DEMO-2026-001`
- Plant ID, for example `PLANT-CH-01`
- Quantity from 1 to 100
- Product category

Submit `Create batch`.

The flow:

1. Creates the batch on Hedera.
2. Mints product identities on Hedera.
3. Mirrors labels and product rows into Supabase.
4. Indexes `BatchCreated` and `BatchMinted` in The Graph.

If chain creation succeeds but the Supabase mirror fails, the operation is recorded for reconciliation instead of silently losing the chain result.

## 7. Confirm dashboard counts

Open:

```text
/manufacturer
```

The dashboard counts come from The Graph, not seed rows:

- `Batches`: number of Graph `Batch` entities
- `Products minted`: sum of Graph `mintedCount`
- `Tags bound`: Graph tags whose status is `Bound`

The page displays `Indexed on The Graph` when the Graph query succeeds.

Wait for indexing if the new batch is not visible immediately.

## 8. Browse batches and products

Open:

```text
/manufacturer/batches
```

Batch operational fields come from Graph:

- Quantity and minted count
- Batch status
- Chain creation timestamp
- Chain transaction hash

Names, plant, category, and batch code remain identity labels from Supabase. Transaction hashes open the Hedera Testnet transaction in HashScan.

Use `Products` on a batch row to filter products for that batch.

Open:

```text
/manufacturer/products
```

You can:

- View all products
- Filter products by batch
- Filter pending or bound products using the dashboard links
- Open an individual product detail page

## 9. Bind an NFC tag

Open:

```text
/manufacturer/nfc
```

1. Select an unbound minted product.
2. Enter an NFC tag UID containing 8 to 20 hexadecimal characters, for example `04AABBCCDD02`.
3. Click `Bind tag`.

Expected result:

```text
Bound <product> to <tag>. Status TAG_BOUND.
```

A product can have one active tag. The page also lists already-bound products and their tag UIDs.

The bind flow writes the chain relationship and mirrors the tag state in Supabase. The Graph indexes the `TagBound` event.

## 10. Inspect the product timeline

Open the manufacturer detail page:

```text
/manufacturer/products/<supabase-product-id>
```

Or open the public product page using the product code or product URL:

```text
/product/<product-code>
```

The timeline is indexed on The Graph and can show:

1. `Created` from `BatchCreated`
2. `Minted` from `BatchMinted`
3. `Tag Bound` from `TagBound`

An unbound product should show `Created` and `Minted` without inventing a `Tag Bound` event.

The manufacturer page also shows Graph-backed batch quantity, status, and chain timestamps. The timeline transaction hashes link to HashScan.

## 11. Verify a product with Scan

Open:

```text
/scan
```

Select a bound product and click the first-tap action.

For an authentic tap, the app:

1. Creates a signed simulator payload.
2. Validates the CMAC off-chain.
3. Consumes the nonce on Hedera.
4. Mirrors verification state in Supabase.
5. Shows product, batch, date, and plant details.
6. Produces a `NonceConsumed` Graph event.

Expected first result:

```text
AUTHENTIC
```

The same tap can be submitted again using the replay button.

Expected replay result:

```text
DUPLICATE
```

The contract rejects the second consume. No second `NonceConsumed` chain event is created. The UI explains that the nonce already exists in The Graph.

Invalid CMAC taps stay off-chain and must not create a Graph nonce row.

## 12. Use the NFC simulator

Open:

```text
/simulator
```

The simulator uses the same simulate and verify APIs as the scan flow.

Available actions:

- `Simulate authentic tap`: generates a new nonce and verifies it
- `Replay same payload`: submits the exact previous payload again
- `Invalid tap`: submits a deliberately invalid payload

After an authentic or duplicate result, the simulator reloads the nonce from Graph and shows the indexed transaction. This verifies that the duplicate state comes from the chain nonce, not from a second database event.

## 13. Revoke a tag

Open the manufacturer product detail page for a bound product:

```text
/manufacturer/products/<supabase-product-id>
```

1. Click `Revoke Tag`.
2. Confirm the immutable action.
3. Wait for the Hedera transaction.
4. Refresh the page.

Expected result:

- The tag status becomes revoked.
- The chain records `TagRevoked`.
- The product no longer behaves as actively bound.
- The Graph timeline can show the revoke event when queried through the entity history.

Revocation is intended to be permanent on chain.

## 14. Reconciliation after a partial manufacturing failure

If Hedera succeeds but a Supabase insert fails, the operation is stored as pending. The app exposes the reconciliation API for a manufacturer session:

```text
POST /api/manufacturing/reconcile
```

Request body:

```json
{
  "operationId": "pending-operation-id"
}
```

The reconciliation action restores the batch and product mirror from the recorded operation metadata and marks the operation successful.

This is mainly an operational recovery path; normal batch creation should not require it.

## 15. Health and API checks

Check the application API health endpoint:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Expected shape:

```json
{
  "ok": true,
  "service": "verichain-api",
  "supabase": true
}
```

Check the Graph endpoint:

```powershell
$query = '{ "query": "{ _meta { block { number } } }" }'
Invoke-RestMethod `
  -Uri http://localhost:8000/subgraphs/name/verichain `
  -Method Post `
  -ContentType "application/json" `
  -Body $query
```

## 16. Optional checks

These checks do not replace the end-to-end UI flow.

Frontend typecheck:

```powershell
cd C:\Users\sunid\Downloads\ETH_Online_2026\frontend
npx tsc --noEmit
```

Graph helper tests with mocked responses:

```powershell
npm run test:graph
```

Live Graph check after indexing catches up:

```powershell
npm run test:graph-live
```

Expected live checks include:

```text
PASS Graph Node returned at least one batch
PASS dashboard batch count is from Graph
PASS products minted is sum of mintedCount
PASS tags bound is a Graph count
```

## 17. Troubleshooting

### Deployment says the specified block does not exist

Check `subgraph/subgraph.yaml` and use a block that exists on Hedera testnet. Rebuild and deploy:

```powershell
cd C:\Users\sunid\Downloads\ETH_Online_2026\subgraph
npm run build
npm run deploy-local
```

### Graph Node cannot resolve the Hedera RPC

Check the services:

```powershell
cd C:\Users\sunid\Downloads\ETH_Online_2026
docker compose -f subgraph\graph-node\docker-compose.yaml ps
```

Read Graph Node logs:

```powershell
docker logs graph-node-graph-node-1 --tail 100
```

Look for successful messages containing `Creating transport` and `Connecting to Ethereum`. The compose file includes explicit DNS servers for this issue.

### Graph is deployed but counts are zero

Deployment and indexing are separate. Check `_meta.block.number` and wait until it reaches the subgraph start block. Then refresh the dashboard or rerun `npm run test:graph-live`.

### Supabase mirror is missing after chain success

Look for a pending manufacturing operation and use the reconciliation endpoint. Do not recreate the same batch code unless you have confirmed the chain and database state.

### Login fails

Check `frontend/.env.local` for Privy, World ID, session, and Supabase configuration. Confirm that the connected wallet belongs to a manufacturer profile in the database.

### Stop everything

Stop the frontend with `Ctrl+C`. Stop Docker services with:

```powershell
cd C:\Users\sunid\Downloads\ETH_Online_2026
docker compose -f subgraph\graph-node\docker-compose.yaml down
```

Do not use `down -v` unless you intentionally want to delete the local Graph/Postgres index.
