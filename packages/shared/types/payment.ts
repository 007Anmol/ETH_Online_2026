export type PaidResource =
  | "PREMIUM_PROVENANCE"
  | "AI_ANOMALY_EXPLANATION"
  | "CONSUMER_VERIFICATION"
  | "AGENT_API";

export type PaymentProof = {
  requestId: string;
  resource: PaidResource;
  payer: string;
  amount: string;
  currency: string;
  network: string;
  transactionId: string;
  expiresAt: number;
};

export type PaymentRecord = PaymentProof & {
  status: "VERIFIED" | "REJECTED";
  createdAt: number;
};