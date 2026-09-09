import { describe, expect, it } from "vitest";
import type { TelemetryBatch } from "../../../packages/shared/types/checkpoint";
import type { AnomalyStore, StoredAnomaly, StoredCheckpoint } from "./anomaly";
import type { BlockchainGateway } from "./blockchain";
import { processTelemetry, resolveTelemetryAnomaly } from "./agent";

class MemoryAnomalyStore implements AnomalyStore {
	checkpoints: StoredCheckpoint[] = [];
	anomalies: StoredAnomaly[] = [];
	resolved: string[] = [];

	async hasProcessed(requestId: string) {
		return this.checkpoints.some((checkpoint) => checkpoint.requestId === requestId);
	}

	async saveCheckpoint(checkpoint: StoredCheckpoint) {
		this.checkpoints.push(checkpoint);
	}

	async saveAnomaly(anomaly: StoredAnomaly) {
		this.anomalies.push(anomaly);
	}

	async resolveAnomaly(requestId: string) {
		this.resolved.push(requestId);
	}
}

class MemoryBlockchain implements BlockchainGateway {
	calls: string[] = [];

	async recordAnomaly() {
		this.calls.push("recordAnomaly");
		return "0xanomaly";
	}

	async freezeEscrowPool() {
		this.calls.push("freezeEscrowPool");
		return "0xfrozen";
	}

	async resolveAnomaly() {
		this.calls.push("resolveAnomaly");
		return "0xresolved-anomaly";
	}

	async resolveEscrowPool() {
		this.calls.push("resolveEscrowPool");
		return "0xresolved-escrow";
	}
}

const batch: TelemetryBatch = {
	requestId: "telemetry-1",
	current: {
		productId: "1",
		checkpoint: "London",
		latitude: 51.5074,
		longitude: -0.1278,
		timestamp: 1_700_000_006,
		expectedRoute: ["Mumbai", "Dubai"],
		actualRoute: ["Mumbai", "New York"],
	},
	previous: {
		productId: "1",
		checkpoint: "Mumbai",
		latitude: 19.076,
		longitude: 72.8777,
		timestamp: 1_700_000_000,
	},
	recent: [{
		productId: "1",
		checkpoint: "London",
		latitude: 51.5074,
		longitude: -0.1278,
		timestamp: 1_700_000_000,
	}],
};

describe("agent acceptance flow", () => {
	it("records and freezes a high-risk checkpoint", async () => {
		const store = new MemoryAnomalyStore();
		const blockchain = new MemoryBlockchain();

		const result = await processTelemetry(batch, store, blockchain);

		expect(result).toMatchObject({
			duplicate: false,
			productId: "1",
			riskScore: 100,
			shouldFreeze: true,
			anomalyTxHash: "0xanomaly",
			escrowTxHash: "0xfrozen",
		});
		expect(blockchain.calls).toEqual(["recordAnomaly", "freezeEscrowPool"]);
		expect(store.checkpoints).toHaveLength(1);
		expect(store.anomalies[0]?.status).toBe("OPEN");
	});

	it("does not repeat blockchain actions for a duplicate request", async () => {
		const store = new MemoryAnomalyStore();
		const blockchain = new MemoryBlockchain();

		await processTelemetry(batch, store, blockchain);
		const duplicate = await processTelemetry(batch, store, blockchain);

		expect(duplicate.duplicate).toBe(true);
		expect(blockchain.calls).toEqual(["recordAnomaly", "freezeEscrowPool"]);
	});

	it("resolves the anomaly and escrow, then updates persistence", async () => {
		const store = new MemoryAnomalyStore();
		const blockchain = new MemoryBlockchain();

		const result = await resolveTelemetryAnomaly("1", batch.requestId, store, blockchain);

		expect(result).toEqual({ anomalyTxHash: "0xresolved-anomaly", escrowTxHash: "0xresolved-escrow" });
		expect(blockchain.calls).toEqual(["resolveAnomaly", "resolveEscrowPool"]);
		expect(store.resolved).toEqual([batch.requestId]);
	});
});