import { delay } from "@/lib/consumer/mocks/delay";
import type { OwnershipProvider } from "@/lib/consumer/providers/types";
import type { ClaimEligibility, ClaimResult, OwnedProduct } from "@/lib/consumer/types";

/**
 * In-memory mock ownership store. Demo-only: state resets on server
 * restart. Matches the deterministic scenarios in demo-data.ts —
 * VC-001028 is pre-owned, VC-001024 and VC-001029 are claimable.
 */
const ALREADY_OWNED = new Set(["VC-001028"]);
const CLAIMABLE = new Set(["VC-001024", "VC-001029"]);

let ownedStore: OwnedProduct[] = [
  {
    productId: "VC-001028",
    name: "Rado HyperChrome Automatic",
    imageUrl: null,
    claimedAt: "2025-12-05T10:00:00Z",
    verification: "VERIFIED",
  },
];

export const mockOwnershipProvider: OwnershipProvider = {
  async getClaimEligibility(productId): Promise<ClaimEligibility> {
    if (ALREADY_OWNED.has(productId)) return delay("ALREADY_OWNED");
    if (CLAIMABLE.has(productId)) return delay("ELIGIBLE");
    return delay("NOT_ELIGIBLE");
  },

  async claimProduct(productId): Promise<ClaimResult> {
    if (ALREADY_OWNED.has(productId)) {
      return delay({ status: "FAILURE", error: "This product is already owned." });
    }

    if (!CLAIMABLE.has(productId)) {
      return delay({
        status: "FAILURE",
        error: "This product is not eligible for a claim yet.",
      });
    }

    ownedStore = [
      {
        productId,
        name: "Rado HyperChrome Automatic",
        imageUrl: null,
        claimedAt: new Date().toISOString(),
        verification: "VERIFIED",
      },
      ...ownedStore,
    ];
    ALREADY_OWNED.add(productId);

    return delay({ status: "SUCCESS" }, 1200);
  },

  async listOwnedProducts() {
    return delay([...ownedStore]);
  },
};
