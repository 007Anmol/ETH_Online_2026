import type { AnomalyResult } from "../../../packages/shared/types/anomaly";
import type { TelemetryBatch } from "../../../packages/shared/types/checkpoint";
import { evaluateTelemetry } from "../../agent/src/riskEngine";

export type CheckpointIngestion = {
	requestId: string;
	checkpoint: TelemetryBatch["current"];
	analysis: AnomalyResult;
};

export function ingestCheckpoint(batch: TelemetryBatch): CheckpointIngestion {
	if (!batch.requestId.trim()) throw new Error("A request ID is required");
	if (batch.previous?.productId !== batch.current.productId) {
		throw new Error("Previous checkpoint belongs to another product");
	}
	if (batch.recent?.some((point) => point.productId !== batch.current.productId)) {
		throw new Error("Recent checkpoints belong to another product");
	}

	return {
		requestId: batch.requestId,
		checkpoint: batch.current,
		analysis: evaluateTelemetry(batch.current, batch.previous, batch.recent),
	};
}
