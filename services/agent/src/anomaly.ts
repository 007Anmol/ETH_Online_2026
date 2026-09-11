import type { AnomalyResult } from "../../../packages/shared/types/anomaly";
import type { TelemetryPoint } from "../../../packages/shared/types/checkpoint";

export type StoredCheckpoint = {
	requestId: string;
	point: TelemetryPoint;
	riskScore: number;
	chainTxHash?: string;
};

export type StoredAnomaly = {
	requestId: string;
	result: AnomalyResult;
	status: "OPEN" | "RESOLVED";
	txHash?: string;
};

export interface AnomalyStore {
	hasProcessed(requestId: string): Promise<boolean>;
	saveCheckpoint(checkpoint: StoredCheckpoint): Promise<void>;
	saveAnomaly(anomaly: StoredAnomaly): Promise<void>;
	resolveAnomaly(requestId: string): Promise<void>;
}
