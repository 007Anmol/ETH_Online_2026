import type { TelemetryBatch } from "../../../packages/shared/types/checkpoint";
import { ingestCheckpoint } from "../../telemetry/src/checkpoint";
import { enrichRiskWithGemini } from "./gemini";
import type { AnomalyStore, StoredAnomaly } from "./anomaly";
import type { BlockchainGateway } from "./blockchain";

export type AgentResult = {
	duplicate: boolean;
	requestId: string;
	productId: string;
	riskScore: number;
	shouldFreeze: boolean;
	checkpointTxHash?: string;
	anomalyTxHash?: string;
	escrowTxHash?: string;
};

export async function processTelemetry(
	batch: TelemetryBatch,
	store: AnomalyStore,
	blockchain: BlockchainGateway,
): Promise<AgentResult> {
	if (await store.hasProcessed(batch.requestId)) {
		return {
			duplicate: true,
			requestId: batch.requestId,
			productId: batch.current.productId,
			riskScore: 0,
			shouldFreeze: false,
		};
	}

	const ingestion = ingestCheckpoint(batch);
	const analysis = await enrichRiskWithGemini(batch, ingestion.analysis);
	const checkpointTxHash = await blockchain.recordCheckpoint(ingestion.checkpoint);
	await store.saveCheckpoint({
		requestId: ingestion.requestId,
		point: ingestion.checkpoint,
		riskScore: analysis.riskScore,
		chainTxHash: checkpointTxHash,
	});

	if (!analysis.shouldFreeze) {
		return {
			duplicate: false,
			requestId: ingestion.requestId,
			productId: ingestion.analysis.productId,
			riskScore: analysis.riskScore,
			shouldFreeze: false,
		};
	}

	const anomalyTxHash = await blockchain.recordAnomaly(
		analysis.productId,
		analysis,
	);
	const escrowTxHash = await blockchain.freezeEscrowPool(
		analysis.productId,
	);

	const anomaly: StoredAnomaly = {
		requestId: ingestion.requestId,
		result: analysis,
		status: "OPEN",
		txHash: anomalyTxHash,
	};
	await store.saveAnomaly(anomaly);

	return {
		duplicate: false,
		requestId: ingestion.requestId,
		productId: analysis.productId,
		riskScore: analysis.riskScore,
		shouldFreeze: true,
		checkpointTxHash,
		anomalyTxHash,
		escrowTxHash,
	};
}

export async function resolveTelemetryAnomaly(
	productId: string,
	requestId: string,
	store: AnomalyStore,
	blockchain: BlockchainGateway,
): Promise<{ anomalyTxHash: string; escrowTxHash: string }> {
	const anomalyTxHash = await blockchain.resolveAnomaly(productId);
	const escrowTxHash = await blockchain.resolveEscrowPool(productId);
	await store.resolveAnomaly(requestId);

	return { anomalyTxHash, escrowTxHash };
}
