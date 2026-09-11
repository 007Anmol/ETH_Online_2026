export type { TelemetryPoint } from "../../packages/shared/types/checkpoint";
import type { AnomalyResult } from "../../packages/shared/types/anomaly";

export type RiskResult = AnomalyResult & {
  checkpointTxHash?: string;
  anomalyTxHash?: string;
  escrowTxHash?: string;
};

export { evaluateTelemetry } from "../../packages/shared/risk";