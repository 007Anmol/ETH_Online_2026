## Supply Chain API

The manufacturing team integrates through the existing Next.js API routes. All
routes persist to the shared schema from migration `004_team2_shared_schema.sql`.
The API never accepts or returns operator private keys.

### Register a checkpoint

`POST /api/checkpoints`

```json
{
	"requestId": "factory-batch-001-checkpoint-01",
	"current": {
		"productId": "1",
		"checkpoint": "FACTORY",
		"latitude": 19.076,
		"longitude": 72.8777,
		"timestamp": 1760000000,
		"expectedRoute": ["Mumbai", "Dubai"],
		"actualRoute": ["Mumbai"]
	},
	"previous": null
}
```

The agent validates the telemetry, optionally enriches the explanation with
Gemini when `GEMINI_API_KEY` is configured, writes the checkpoint to Hedera EVM,
and freezes anomaly escrow when policy requires it. The response includes
`checkpointTxHash`, `anomalyTxHash`, and `escrowTxHash` when those actions occur.

### Create and accept shipments

- `POST /api/shipments` persists the confirmed on-chain shipment reference.
- `GET /api/shipments?productId=<id>` returns shipment history.
- `PATCH /api/shipments` updates status after an on-chain acceptance.
- `GET /api/custody?productId=<id>` returns the custody chain.

The browser performs the user-authorized Hedera EVM transaction; the API stores
the resulting hash and metadata for manufacturing and distribution systems.

### Consumer verification

`GET /api/verification?productId=<id>` requires an x402 HBAR payment. The
payment is verified against the Hedera Mirror Node before shipment and anomaly
records are returned.

### Settlement

Escrow is created and released through the Hedera EVM escrow contract. The
Uniswap v4 hook checks the product status and escrow status before a pool swap
can settle. A flagged product or frozen escrow is rejected by the hook. The
hook address and pool manager address are deployment configuration, not values
hard-coded in the frontend.
