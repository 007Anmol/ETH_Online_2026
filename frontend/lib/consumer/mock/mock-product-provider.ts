import type { ProductDataProvider } from "@/lib/consumer/providers";
import {
  buildVerificationResult,
  findMockJourney,
  findMockProduct,
  findMockProof,
} from "@/lib/consumer/mock/mock-data";

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Deterministic stand-in for the real product data source. The UI depends
 * only on `ProductDataProvider`, so this can be swapped for an adapter over
 * `getPublicProduct`/`verifyTap` (see lib/nfc/*) without touching a single
 * component.
 */
export class MockProductProvider implements ProductDataProvider {
  async getProduct(productId: string) {
    return delay(findMockProduct(productId), 300);
  }

  async verifyProduct(productId: string) {
    return delay(buildVerificationResult(productId), 600);
  }

  async getJourney(productId: string) {
    return delay(findMockJourney(productId), 300);
  }

  async getBlockchainProof(productId: string) {
    return delay(findMockProof(productId), 300);
  }
}
