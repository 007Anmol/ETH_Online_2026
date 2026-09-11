import type { AnomalyResult } from "../../../packages/shared/types/anomaly";
import type { TelemetryPoint } from "../../../packages/shared/types/checkpoint";

export interface BlockchainGateway {
	recordCheckpoint(point: TelemetryPoint): Promise<string>;
	recordAnomaly(productId: string, result: AnomalyResult): Promise<string>;
	freezeEscrowPool(productId: string): Promise<string>;
	resolveAnomaly(productId: string): Promise<string>;
	resolveEscrowPool(productId: string): Promise<string>;
}
