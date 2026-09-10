import type { ProductCategory, ProductStatus } from "@/lib/types";

export const VERIFICATION_OUTCOMES = [
  "VERIFIED",
  "INCOMPLETE",
  "SUSPICIOUS",
  "NOT_FOUND",
] as const;
export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number];

export type ConsumerProduct = {
  productId: string;
  name: string;
  category: ProductCategory | null;
  imageUrl: string | null;
  manufacturerName: string;
  origin: string;
  manufacturingDate: string | null;
  status: ProductStatus | null;
  chainTxHash: string | null;
};

export type VerificationStepId =
  | "PRODUCT_IDENTITY"
  | "MANUFACTURER"
  | "SUPPLY_CHAIN"
  | "BLOCKCHAIN_PROOF";

export type VerificationStepStatus =
  | "pending"
  | "checking"
  | "passed"
  | "failed";

export type VerificationStep = {
  id: VerificationStepId;
  label: string;
  status: VerificationStepStatus;
};

export type VerificationRun = {
  productId: string;
  outcome: VerificationOutcome;
  steps: VerificationStep[];
  summary: string;
  checkedAt: string;
};

export type JourneyEventActorRole =
  | "MANUFACTURER"
  | "DISTRIBUTOR"
  | "LOGISTICS_PROVIDER"
  | "RETAILER"
  | "CONSUMER";

export type JourneyEventState = "NORMAL" | "MISSING" | "ANOMALY";

export type ProductJourneyEvent = {
  id: string;
  label: string;
  actor: string;
  role: JourneyEventActorRole;
  location: string | null;
  occurredAt: string | null;
  state: JourneyEventState;
  description: string;
};

export type ProductJourney = {
  productId: string;
  events: ProductJourneyEvent[];
};

export type BlockchainProofState = "CONFIRMED" | "PENDING" | "UNAVAILABLE";

export type BlockchainProof = {
  productId: string;
  state: BlockchainProofState;
  network: string;
  layer: string;
  contractAddress: string | null;
  transactionHash: string | null;
  blockNumber: number | null;
  timestamp: string | null;
  eventType: string | null;
};

export type ClaimEligibility = "ELIGIBLE" | "ALREADY_OWNED" | "NOT_ELIGIBLE";
export type ClaimStatus = "IDLE" | "PROCESSING" | "SUCCESS" | "FAILURE";

export type ClaimResult = {
  status: Extract<ClaimStatus, "SUCCESS" | "FAILURE">;
  error?: string;
};

export type OwnedProduct = {
  productId: string;
  name: string;
  imageUrl: string | null;
  claimedAt: string;
  verification: VerificationOutcome;
};

export type ConsumerLoginMethod = "EMAIL" | "GOOGLE" | "WALLET";

export type ConsumerIdentity = {
  displayName: string;
  loginMethod: ConsumerLoginMethod;
  walletAddress: string | null;
};
