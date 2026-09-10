import { mockConsumerAuthProvider } from "@/lib/consumer/mocks/mock-auth-provider";
import { mockOwnershipProvider } from "@/lib/consumer/mocks/mock-ownership-provider";
import { mockProductProvider } from "@/lib/consumer/mocks/mock-product-provider";
import type {
  ConsumerAuthProvider,
  OwnershipProvider,
  ProductDataProvider,
} from "@/lib/consumer/providers/types";

/**
 * Single wiring point for consumer data access. Pages and hooks import
 * these instances, never the mock modules directly — swapping to a real
 * backend later means changing only the right-hand side here.
 */
export const productDataProvider: ProductDataProvider = mockProductProvider;
export const ownershipProvider: OwnershipProvider = mockOwnershipProvider;
export const consumerAuthProvider: ConsumerAuthProvider = mockConsumerAuthProvider;

export type {
  ConsumerAuthProvider,
  OwnershipProvider,
  ProductDataProvider,
} from "@/lib/consumer/providers/types";
