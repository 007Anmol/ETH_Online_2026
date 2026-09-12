import type {
  BlockchainProof,
  ConsumerIdentity,
  ConsumerProduct,
  Grievance,
  GrievanceSubmission,
  MarketplaceListing,
  OwnedProduct,
  OwnershipClaimStatus,
  ProductJourney,
  TransferRecord,
  VerificationResult,
} from "@/lib/consumer/types";

/**
 * Everything the UI needs to know about one product: identity, verification,
 * provenance, and on-chain proof. Kept as a single interface (rather than four
 * separate ones) because every current and planned data source — the mock
 * provider today, `getPublicProduct`/`verifyTap` tomorrow — answers all four
 * questions from the same underlying record.
 */
export interface ProductDataProvider {
  getProduct(productId: string): Promise<ConsumerProduct | null>;
  verifyProduct(productId: string): Promise<VerificationResult>;
  getJourney(productId: string): Promise<ProductJourney | null>;
  getBlockchainProof(productId: string): Promise<BlockchainProof | null>;
}

export interface ConsumerAuthProvider {
  getIdentity(): Promise<ConsumerIdentity | null>;
  login(method: ConsumerIdentity["authMethod"]): Promise<ConsumerIdentity>;
  logout(): Promise<void>;
}

export interface OwnershipProvider {
  getClaimStatus(productId: string): Promise<OwnershipClaimStatus>;
  claimProduct(productId: string): Promise<OwnershipClaimStatus>;
  listOwnedProducts(): Promise<OwnedProduct[]>;
}

/**
 * NFT ownership transfer to another wallet. A real implementation swaps this
 * for a contract-backed adapter (transfer function, signing flow, tx status
 * polling) — the UI only ever talks to this interface.
 */
export interface TransferProvider {
  initiateTransfer(productId: string, toAddress: string): Promise<TransferRecord>;
  getTransfer(transferId: string): Promise<TransferRecord | null>;
}

/**
 * Consumer-to-consumer resale. A real implementation swaps this for a
 * marketplace contract adapter (listing/escrow/payment) — until that spec
 * exists, the mock provider keeps listings and settlement in memory.
 */
export interface MarketplaceProvider {
  listActiveListings(): Promise<MarketplaceListing[]>;
  listMyListings(): Promise<MarketplaceListing[]>;
  getListing(listingId: string): Promise<MarketplaceListing | null>;
  createListing(productId: string, priceUsd: number): Promise<MarketplaceListing>;
  cancelListing(listingId: string): Promise<void>;
  buyListing(listingId: string): Promise<TransferRecord>;
}

/**
 * Consumer grievance reporting. A real implementation swaps this for the
 * backend's grievance API (POST/GET grievance, evidence upload) — none of
 * this is meant to live on-chain.
 */
export interface GrievanceProvider {
  submitGrievance(input: GrievanceSubmission): Promise<Grievance>;
  listGrievances(): Promise<Grievance[]>;
  getGrievance(grievanceId: string): Promise<Grievance | null>;
}
