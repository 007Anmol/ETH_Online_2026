import type { MarketplaceProvider } from "@/lib/consumer/providers";
import {
  buyMockListing,
  cancelMockListing,
  createMockListing,
  findMockListing,
  listMockActiveListings,
  listMockMyListings,
} from "@/lib/consumer/mock/mock-data";

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class MockMarketplaceProvider implements MarketplaceProvider {
  async listActiveListings() {
    return delay(listMockActiveListings(), 300);
  }

  async listMyListings() {
    return delay(listMockMyListings(), 300);
  }

  async getListing(listingId: string) {
    return delay(findMockListing(listingId), 300);
  }

  async createListing(productId: string, priceUsd: number) {
    const listing = createMockListing(productId, priceUsd);
    if (!listing) throw new Error("Product is not eligible for listing.");
    return delay(listing, 700);
  }

  async cancelListing(listingId: string) {
    cancelMockListing(listingId);
    await delay(null, 400);
  }

  async buyListing(listingId: string) {
    const result = buyMockListing(listingId);
    if (!result) throw new Error("Listing is no longer available.");
    return delay(result.transfer, 1100);
  }
}
