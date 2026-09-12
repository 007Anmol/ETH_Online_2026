import { MockConsumerAuthProvider } from "@/lib/consumer/mock/mock-auth-provider";
import { MockGrievanceProvider } from "@/lib/consumer/mock/mock-grievance-provider";
import { MockMarketplaceProvider } from "@/lib/consumer/mock/mock-marketplace-provider";
import { MockOwnershipProvider } from "@/lib/consumer/mock/mock-ownership-provider";
import { MockProductProvider } from "@/lib/consumer/mock/mock-product-provider";
import { MockTransferProvider } from "@/lib/consumer/mock/mock-transfer-provider";

/**
 * Single wiring point for consumer data sources. Hooks and pages import from
 * here, never from a concrete `Mock*Provider` directly — swapping a provider
 * for a real implementation is a one-line change in this file.
 */
export const productDataProvider = new MockProductProvider();
export const consumerAuthProvider = new MockConsumerAuthProvider();
export const ownershipProvider = new MockOwnershipProvider();
export const transferProvider = new MockTransferProvider();
export const marketplaceProvider = new MockMarketplaceProvider();
export const grievanceProvider = new MockGrievanceProvider();
