import type { ProductCategory } from "@verichain/shared";

/**
 * Consumer-facing verification narrative. Distinct from the low-level NFC tap
 * result (`VerificationResult` in `@verichain/shared`, e.g. AUTHENTIC/DUPLICATE/
 * INVALID/ERROR) — this is the story told to a shopper, not the chain-level
 * outcome of one tap. A future adapter maps tap results onto this narrative.
 */
export type ConsumerVerificationStatus =
  | "VERIFIED"
  | "INCOMPLETE"
  | "SUSPICIOUS"
  | "NOT_FOUND";

export type ConsumerProduct = {
  productId: string;
  productCode: string;
  name: string;
  category: ProductCategory;
  manufacturer: string;
  origin: string;
  manufacturingDate: string;
  imageUrl: string | null;
  status: ConsumerVerificationStatus;
};

export type VerificationStep = {
  id: string;
  label: string;
  status: "pending" | "checking" | "passed" | "failed";
};

export type VerificationResult = {
  status: ConsumerVerificationStatus;
  productId: string;
  steps: VerificationStep[];
  summary: string;
  checkedAt: string;
};

export type JourneyEventStatus = "normal" | "incomplete" | "anomaly";

export type JourneyEvent = {
  id: string;
  stage:
    | "MANUFACTURER"
    | "MANUFACTURING"
    | "QUALITY_CHECK"
    | "DISTRIBUTOR"
    | "LOGISTICS"
    | "RETAILER"
    | "CONSUMER";
  actor: string;
  role: string;
  location: string;
  timestamp: string;
  status: JourneyEventStatus;
  note: string | null;
};

export type ProductJourney = {
  productId: string;
  events: JourneyEvent[];
};

export type BlockchainProofStatus = "confirmed" | "pending" | "unavailable";

export type BlockchainProof = {
  productId: string;
  status: BlockchainProofStatus;
  network: string;
  layer: string;
  contractAddress: string | null;
  transactionHash: string | null;
  blockNumber: number | null;
  timestamp: string | null;
  verificationEvent: string;
};

export type OwnershipClaimStatus =
  | "eligible"
  | "already_owned"
  | "processing"
  | "success"
  | "failure";

export type OwnedProduct = {
  productId: string;
  productCode: string;
  name: string;
  imageUrl: string | null;
  status: ConsumerVerificationStatus;
  claimedAt: string;
};

export type ConsumerAuthMethod = "google" | "email" | "wallet";

export type ConsumerIdentity = {
  profileId: string;
  walletAddress: string;
  displayName: string | null;
  authMethod: ConsumerAuthMethod;
};

/**
 * Ownership transfer. `status` mirrors what an on-chain transfer would report
 * (pending confirmation → confirmed/failed) — the mock provider fabricates
 * this locally since no transfer contract/API exists yet.
 */
export type TransferRecordStatus = "pending" | "confirmed" | "failed";

export type TransferRecord = {
  transferId: string;
  productId: string;
  toAddress: string;
  status: TransferRecordStatus;
  createdAt: string;
  confirmedAt: string | null;
};

export type ListingStatus = "active" | "sold" | "cancelled";

export type MarketplaceListing = {
  listingId: string;
  productId: string;
  productCode: string;
  name: string;
  category: ProductCategory;
  imageUrl: string | null;
  priceUsd: number;
  sellerDisplayName: string;
  mine: boolean;
  status: ListingStatus;
  createdAt: string;
};

export type GrievanceCategory =
  | "counterfeit_suspicion"
  | "damaged_product"
  | "missing_history"
  | "ownership_dispute"
  | "other";

export type GrievanceStatus = "open" | "under_review" | "resolved" | "rejected";

export type GrievanceEvent = {
  id: string;
  status: GrievanceStatus;
  note: string;
  timestamp: string;
};

export type Grievance = {
  grievanceId: string;
  productId: string;
  productName: string;
  category: GrievanceCategory;
  description: string;
  evidenceFileName: string | null;
  status: GrievanceStatus;
  createdAt: string;
  events: GrievanceEvent[];
};

export type GrievanceSubmission = {
  productId: string;
  category: GrievanceCategory;
  description: string;
  evidenceFileName?: string | null;
};
