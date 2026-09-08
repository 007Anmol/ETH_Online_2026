import type { AnomalyResult } from "../../../packages/shared/types/anomaly";

export interface BlockchainGateway {
	recordAnomaly(productId: string, result: AnomalyResult): Promise<string>;
	freezeEscrowPool(productId: string): Promise<string>;
	resolveAnomaly(productId: string): Promise<string>;
	resolveEscrowPool(productId: string): Promise<string>;
}
