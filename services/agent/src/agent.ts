import type { TelemetryBatch } from "../../../packages/shared/types/checkpoint";
import { ingestCheckpoint } from "../../telemetry/src/checkpoint";
import type { AnomalyStore, StoredAnomaly } from "./anomaly";
import type { BlockchainGateway } from "./blockchain";

export type AgentResult = {
	duplicate: boolean;
	requestId: string;
	productId: string;
	riskScore: number;
	shouldFreeze: boolean;
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
	await store.saveCheckpoint({
		requestId: ingestion.requestId,
		point: ingestion.checkpoint,
		riskScore: ingestion.analysis.riskScore,
	});

	if (!ingestion.analysis.shouldFreeze) {
		return {
			duplicate: false,
			requestId: ingestion.requestId,
			productId: ingestion.analysis.productId,
			riskScore: ingestion.analysis.riskScore,
			shouldFreeze: false,
		};
	}

	const anomalyTxHash = await blockchain.recordAnomaly(
		ingestion.analysis.productId,
		ingestion.analysis,
	);
	const escrowTxHash = await blockchain.freezeEscrowPool(
		ingestion.analysis.productId,
	);

	const anomaly: StoredAnomaly = {
		requestId: ingestion.requestId,
		result: ingestion.analysis,
		status: "OPEN",
		txHash: anomalyTxHash,
	};
	await store.saveAnomaly(anomaly);

	return {
		duplicate: false,
		requestId: ingestion.requestId,
		productId: ingestion.analysis.productId,
		riskScore: ingestion.analysis.riskScore,
		shouldFreeze: true,
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
