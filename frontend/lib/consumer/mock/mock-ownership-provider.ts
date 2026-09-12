import type { OwnershipProvider } from "@/lib/consumer/providers";
import { findMockClaimStatus, listMockOwnedProducts } from "@/lib/consumer/mock/mock-data";

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class MockOwnershipProvider implements OwnershipProvider {
  async getClaimStatus(productId: string) {
    return delay(findMockClaimStatus(productId), 300);
  }

  async claimProduct(productId: string) {
    const current = findMockClaimStatus(productId);

    if (current === "already_owned") {
      return delay(current, 300);
    }

    return delay<"success">("success", 900);
  }

  async listOwnedProducts() {
    return delay(listMockOwnedProducts(), 300);
  }
}
