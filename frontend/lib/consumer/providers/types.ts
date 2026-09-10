import type {
  BlockchainProof,
  ClaimEligibility,
  ClaimResult,
  ConsumerIdentity,
  ConsumerLoginMethod,
  ConsumerProduct,
  OwnedProduct,
  ProductJourney,
  VerificationRun,
} from "@/lib/consumer/types";

/**
 * Everything the consumer UI needs to know about a physical product:
 * identity, live verification, its supply-chain journey, and the
 * blockchain evidence backing it. One interface because these four
 * questions are always asked together in the consumer flow.
 */
export interface ProductDataProvider {
  getProduct(productId: string): Promise<ConsumerProduct | null>;
  verifyProduct(productId: string): Promise<VerificationRun>;
  getJourney(productId: string): Promise<ProductJourney | null>;
  getBlockchainProof(productId: string): Promise<BlockchainProof | null>;
}

/** Consumer-side ownership: claiming a verified product and listing what's owned. */
export interface OwnershipProvider {
  getClaimEligibility(productId: string): Promise<ClaimEligibility>;
  claimProduct(productId: string): Promise<ClaimResult>;
  listOwnedProducts(): Promise<OwnedProduct[]>;
}

/** Consumer identity — deliberately separate from manufacturer session/auth. */
export interface ConsumerAuthProvider {
  getIdentity(): Promise<ConsumerIdentity | null>;
  login(method: ConsumerLoginMethod): Promise<ConsumerIdentity>;
  logout(): Promise<void>;
}
