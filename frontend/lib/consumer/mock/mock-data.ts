import type {
  BlockchainProof,
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
 * Deterministic demo catalog. Each ID always resolves to the same outcome so
 * the hackathon demo never depends on random state (master prompt section 44).
 */
const PRODUCTS: Record<string, ConsumerProduct> = {
  "VC-001024": {
    productId: "VC-001024",
    productCode: "VC-001024",
    name: "Meridian Chronograph",
    category: "WATCHES",
    manufacturer: "Meridian Timeworks",
    origin: "Geneva, Switzerland",
    manufacturingDate: "2026-03-12",
    imageUrl: null,
    status: "VERIFIED",
  },
  "VC-001025": {
    productId: "VC-001025",
    productCode: "VC-001025",
    name: "Atlas Field Jacket",
    category: "APPAREL",
    manufacturer: "Atlas Outfitters",
    origin: "Porto, Portugal",
    manufacturingDate: "2026-01-28",
    imageUrl: null,
    status: "INCOMPLETE",
  },
  "VC-001026": {
    productId: "VC-001026",
    productCode: "VC-001026",
    name: "Solstice Leather Tote",
    category: "BAGS",
    manufacturer: "Solstice Atelier",
    origin: "Florence, Italy",
    manufacturingDate: "2025-11-04",
    imageUrl: null,
    status: "SUSPICIOUS",
  },
  "VC-001028": {
    productId: "VC-001028",
    productCode: "VC-001028",
    name: "Voyager Trail Runner",
    category: "SHOES",
    manufacturer: "Voyager Footwear",
    origin: "Ho Chi Minh City, Vietnam",
    manufacturingDate: "2026-02-17",
    imageUrl: null,
    status: "VERIFIED",
  },
  "VC-001029": {
    productId: "VC-001029",
    productCode: "VC-001029",
    name: "Beacon Chronograph",
    category: "WATCHES",
    manufacturer: "Beacon & Co.",
    origin: "Geneva, Switzerland",
    manufacturingDate: "2026-04-02",
    imageUrl: null,
    status: "VERIFIED",
  },
};

const VERIFICATION_SUMMARY: Record<string, string> = {
  "VC-001024": "Identity, manufacturer, and supply chain all check out against the on-chain record.",
  "VC-001025": "Product identity is confirmed, but part of its supply chain record is missing.",
  "VC-001026": "Product identity does not match the manufacturer's on-chain record.",
  "VC-001028": "Identity, manufacturer, and supply chain all check out against the on-chain record.",
  "VC-001029": "Identity, manufacturer, and supply chain all check out against the on-chain record.",
};

const STEP_LABELS = [
  { id: "identity", label: "Checking product identity" },
  { id: "manufacturer", label: "Checking manufacturer" },
  { id: "supply-chain", label: "Checking supply chain" },
  { id: "proof", label: "Checking blockchain proof" },
] as const;

export function buildVerificationResult(productId: string): VerificationResult {
  const product = PRODUCTS[productId];

  if (!product) {
    return {
      status: "NOT_FOUND",
      productId,
      steps: STEP_LABELS.map((step, index) => ({
        ...step,
        status: index === 0 ? "failed" : "pending",
      })),
      summary: "No product matches this ID.",
      checkedAt: new Date().toISOString(),
    };
  }

  const failIndex =
    product.status === "SUSPICIOUS" ? 1 : product.status === "INCOMPLETE" ? 2 : -1;

  return {
    status: product.status,
    productId,
    steps: STEP_LABELS.map((step, index) => ({
      ...step,
      status:
        failIndex === -1
          ? "passed"
          : index < failIndex
            ? "passed"
            : index === failIndex
              ? "failed"
              : "pending",
    })),
    summary: VERIFICATION_SUMMARY[productId] ?? "Verification complete.",
    checkedAt: new Date().toISOString(),
  };
}

const JOURNEYS: Record<string, ProductJourney> = {
  "VC-001024": {
    productId: "VC-001024",
    events: [
      { id: "j1", stage: "MANUFACTURER", actor: "Meridian Timeworks", role: "Manufacturer", location: "Geneva, Switzerland", timestamp: "2026-03-12T09:00:00Z", status: "normal", note: null },
      { id: "j2", stage: "MANUFACTURING", actor: "Meridian Timeworks", role: "Factory Operator", location: "Geneva, Switzerland", timestamp: "2026-03-12T14:30:00Z", status: "normal", note: null },
      { id: "j3", stage: "QUALITY_CHECK", actor: "Meridian QA Lab", role: "Quality Inspector", location: "Geneva, Switzerland", timestamp: "2026-03-13T10:00:00Z", status: "normal", note: null },
      { id: "j4", stage: "DISTRIBUTOR", actor: "Alpine Distribution", role: "Distributor", location: "Zurich, Switzerland", timestamp: "2026-03-15T08:00:00Z", status: "normal", note: null },
      { id: "j5", stage: "LOGISTICS", actor: "SwissPost Freight", role: "Logistics Provider", location: "In transit", timestamp: "2026-03-18T00:00:00Z", status: "normal", note: null },
      { id: "j6", stage: "RETAILER", actor: "Horizon Boutique", role: "Retailer", location: "New York, USA", timestamp: "2026-03-22T12:00:00Z", status: "normal", note: null },
    ],
  },
  "VC-001025": {
    productId: "VC-001025",
    events: [
      { id: "j1", stage: "MANUFACTURER", actor: "Atlas Outfitters", role: "Manufacturer", location: "Porto, Portugal", timestamp: "2026-01-28T09:00:00Z", status: "normal", note: null },
      { id: "j2", stage: "MANUFACTURING", actor: "Atlas Outfitters", role: "Factory Operator", location: "Porto, Portugal", timestamp: "2026-01-28T15:00:00Z", status: "normal", note: null },
      { id: "j3", stage: "QUALITY_CHECK", actor: "Atlas Outfitters", role: "Quality Inspector", location: "Porto, Portugal", timestamp: "2026-01-29T09:00:00Z", status: "incomplete", note: "Custody handoff to distributor was never recorded on-chain." },
      { id: "j4", stage: "RETAILER", actor: "Northgate Supply Co.", role: "Retailer", location: "Chicago, USA", timestamp: "2026-02-10T12:00:00Z", status: "normal", note: null },
    ],
  },
  "VC-001026": {
    productId: "VC-001026",
    events: [
      { id: "j1", stage: "MANUFACTURER", actor: "Solstice Atelier", role: "Manufacturer", location: "Florence, Italy", timestamp: "2025-11-04T09:00:00Z", status: "normal", note: null },
      { id: "j2", stage: "MANUFACTURING", actor: "Solstice Atelier", role: "Factory Operator", location: "Florence, Italy", timestamp: "2025-11-04T16:00:00Z", status: "normal", note: null },
      { id: "j3", stage: "DISTRIBUTOR", actor: "Unknown distributor", role: "Distributor", location: "Unverified", timestamp: "2025-11-20T00:00:00Z", status: "anomaly", note: "Custody record does not match the manufacturer's authorized distributor list." },
      { id: "j4", stage: "RETAILER", actor: "Marketplace Reseller", role: "Retailer", location: "Unverified", timestamp: "2025-12-05T00:00:00Z", status: "anomaly", note: "No verifiable link to the original manufacturing record." },
    ],
  },
  "VC-001028": {
    productId: "VC-001028",
    events: [
      { id: "j1", stage: "MANUFACTURER", actor: "Voyager Footwear", role: "Manufacturer", location: "Ho Chi Minh City, Vietnam", timestamp: "2026-02-17T09:00:00Z", status: "normal", note: null },
      { id: "j2", stage: "MANUFACTURING", actor: "Voyager Footwear", role: "Factory Operator", location: "Ho Chi Minh City, Vietnam", timestamp: "2026-02-17T18:00:00Z", status: "normal", note: null },
      { id: "j3", stage: "QUALITY_CHECK", actor: "Voyager QA", role: "Quality Inspector", location: "Ho Chi Minh City, Vietnam", timestamp: "2026-02-18T09:00:00Z", status: "normal", note: null },
      { id: "j4", stage: "LOGISTICS", actor: "Pacific Freight", role: "Logistics Provider", location: "In transit", timestamp: "2026-02-22T00:00:00Z", status: "normal", note: null },
      { id: "j5", stage: "RETAILER", actor: "Trailhead Co-op", role: "Retailer", location: "Denver, USA", timestamp: "2026-03-01T12:00:00Z", status: "normal", note: null },
      { id: "j6", stage: "CONSUMER", actor: "Verified owner", role: "Consumer", location: "Denver, USA", timestamp: "2026-03-05T12:00:00Z", status: "normal", note: null },
    ],
  },
  "VC-001029": {
    productId: "VC-001029",
    events: [
      { id: "j1", stage: "MANUFACTURER", actor: "Beacon & Co.", role: "Manufacturer", location: "Geneva, Switzerland", timestamp: "2026-04-02T09:00:00Z", status: "normal", note: null },
      { id: "j2", stage: "MANUFACTURING", actor: "Beacon & Co.", role: "Factory Operator", location: "Geneva, Switzerland", timestamp: "2026-04-02T15:00:00Z", status: "normal", note: null },
      { id: "j3", stage: "QUALITY_CHECK", actor: "Beacon QA Lab", role: "Quality Inspector", location: "Geneva, Switzerland", timestamp: "2026-04-03T09:00:00Z", status: "normal", note: null },
      { id: "j4", stage: "RETAILER", actor: "Horizon Boutique", role: "Retailer", location: "New York, USA", timestamp: "2026-04-10T12:00:00Z", status: "normal", note: null },
    ],
  },
};

const PROOFS: Record<string, BlockchainProof> = {
  "VC-001024": {
    productId: "VC-001024",
    status: "confirmed",
    network: "Hedera",
    layer: "L1",
    contractAddress: "0x4f9a1e2b3c5d6e7f8091a2b3c4d5e6f708192a3b",
    transactionHash: "0x7c2e9f1a4b6d8e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7081",
    blockNumber: 58234910,
    timestamp: "2026-03-12T09:02:11Z",
    verificationEvent: "PRODUCT_MINTED",
  },
  "VC-001025": {
    productId: "VC-001025",
    status: "confirmed",
    network: "Hedera",
    layer: "L1",
    contractAddress: "0x4f9a1e2b3c5d6e7f8091a2b3c4d5e6f708192a3b",
    transactionHash: "0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f80",
    blockNumber: 58011442,
    timestamp: "2026-01-28T09:03:47Z",
    verificationEvent: "PRODUCT_MINTED",
  },
  "VC-001026": {
    productId: "VC-001026",
    status: "unavailable",
    network: "Hedera",
    layer: "L1",
    contractAddress: null,
    transactionHash: null,
    blockNumber: null,
    timestamp: null,
    verificationEvent: "NO_MATCHING_RECORD",
  },
  "VC-001028": {
    productId: "VC-001028",
    status: "confirmed",
    network: "Hedera",
    layer: "L1",
    contractAddress: "0x4f9a1e2b3c5d6e7f8091a2b3c4d5e6f708192a3b",
    transactionHash: "0x9f8e7d6c5b4a3928170695847362514038291a0b1c2d3e4f5061728394a5b6c",
    blockNumber: 58102337,
    timestamp: "2026-02-17T09:04:02Z",
    verificationEvent: "PRODUCT_MINTED",
  },
  "VC-001029": {
    productId: "VC-001029",
    status: "pending",
    network: "Hedera",
    layer: "L1",
    contractAddress: "0x4f9a1e2b3c5d6e7f8091a2b3c4d5e6f708192a3b",
    transactionHash: "0x2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091",
    blockNumber: null,
    timestamp: "2026-04-02T09:05:00Z",
    verificationEvent: "PRODUCT_MINTED",
  },
};

const CLAIM_STATUS: Record<string, OwnershipClaimStatus> = {
  "VC-001024": "eligible",
  "VC-001025": "eligible",
  "VC-001026": "eligible",
  "VC-001028": "already_owned",
  "VC-001029": "eligible",
};

const OWNED_PRODUCTS: OwnedProduct[] = [
  {
    productId: "VC-001028",
    productCode: "VC-001028",
    name: "Voyager Trail Runner",
    imageUrl: null,
    status: "VERIFIED",
    claimedAt: "2026-03-05T12:00:00Z",
  },
];

export function findMockProduct(productId: string): ConsumerProduct | null {
  return PRODUCTS[productId] ?? null;
}

export function findMockJourney(productId: string): ProductJourney | null {
  return JOURNEYS[productId] ?? null;
}

export function findMockProof(productId: string): BlockchainProof | null {
  return PROOFS[productId] ?? null;
}

export function findMockClaimStatus(productId: string): OwnershipClaimStatus {
  return CLAIM_STATUS[productId] ?? "eligible";
}

export function listMockOwnedProducts(): OwnedProduct[] {
  return OWNED_PRODUCTS;
}

export function listMockProductCatalog(): ConsumerProduct[] {
  return Object.values(PRODUCTS);
}

export function findMockOwnedProduct(productId: string): OwnedProduct | null {
  return OWNED_PRODUCTS.find((product) => product.productId === productId) ?? null;
}

function generateMockId(prefix: string): string {
  return `${prefix}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

/**
 * In-memory-only stores for the three not-yet-backed features (transfer,
 * resale, grievance). They reset on reload — acceptable for a frontend-only
 * demo with no backend/blockchain to persist against yet.
 */
const TRANSFERS: TransferRecord[] = [];

export function createMockTransfer(productId: string, toAddress: string): TransferRecord {
  const record: TransferRecord = {
    transferId: generateMockId("TRF"),
    productId,
    toAddress,
    status: "pending",
    createdAt: new Date().toISOString(),
    confirmedAt: null,
  };
  TRANSFERS.push(record);
  return record;
}

export function confirmMockTransfer(transferId: string): TransferRecord | null {
  const record = TRANSFERS.find((entry) => entry.transferId === transferId);
  if (!record) return null;

  record.status = "confirmed";
  record.confirmedAt = new Date().toISOString();

  const index = OWNED_PRODUCTS.findIndex((product) => product.productId === record.productId);
  if (index !== -1) OWNED_PRODUCTS.splice(index, 1);

  return record;
}

export function findMockTransfer(transferId: string): TransferRecord | null {
  return TRANSFERS.find((entry) => entry.transferId === transferId) ?? null;
}

const LISTINGS: MarketplaceListing[] = [
  {
    listingId: "LST-100001",
    productId: "VC-001024",
    productCode: "VC-001024",
    name: "Meridian Chronograph",
    category: "WATCHES",
    imageUrl: null,
    priceUsd: 4200,
    sellerDisplayName: "Amara K.",
    mine: false,
    status: "active",
    createdAt: "2026-04-18T10:00:00Z",
  },
  {
    listingId: "LST-100002",
    productId: "VC-001025",
    productCode: "VC-001025",
    name: "Atlas Field Jacket",
    category: "APPAREL",
    imageUrl: null,
    priceUsd: 265,
    sellerDisplayName: "Devon R.",
    mine: false,
    status: "active",
    createdAt: "2026-04-20T15:30:00Z",
  },
];

export function listMockActiveListings(): MarketplaceListing[] {
  return LISTINGS.filter((listing) => listing.status === "active");
}

export function listMockMyListings(): MarketplaceListing[] {
  return LISTINGS.filter((listing) => listing.mine);
}

export function findMockListing(listingId: string): MarketplaceListing | null {
  return LISTINGS.find((listing) => listing.listingId === listingId) ?? null;
}

export function createMockListing(productId: string, priceUsd: number): MarketplaceListing | null {
  const owned = findMockOwnedProduct(productId);
  if (!owned) return null;

  const listing: MarketplaceListing = {
    listingId: generateMockId("LST"),
    productId: owned.productId,
    productCode: owned.productCode,
    name: owned.name,
    category: PRODUCTS[productId]?.category ?? "APPAREL",
    imageUrl: owned.imageUrl,
    priceUsd,
    sellerDisplayName: "You",
    mine: true,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  LISTINGS.unshift(listing);
  return listing;
}

export function cancelMockListing(listingId: string): MarketplaceListing | null {
  const listing = LISTINGS.find((entry) => entry.listingId === listingId);
  if (!listing) return null;
  listing.status = "cancelled";
  return listing;
}

export function buyMockListing(listingId: string): { listing: MarketplaceListing; transfer: TransferRecord } | null {
  const listing = LISTINGS.find((entry) => entry.listingId === listingId);
  if (!listing || listing.status !== "active") return null;

  listing.status = "sold";

  const transfer: TransferRecord = {
    transferId: generateMockId("TRF"),
    productId: listing.productId,
    toAddress: "0xYOUR_WALLET_ADDRESS",
    status: "confirmed",
    createdAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  };
  TRANSFERS.push(transfer);

  OWNED_PRODUCTS.unshift({
    productId: listing.productId,
    productCode: listing.productCode,
    name: listing.name,
    imageUrl: listing.imageUrl,
    status: PRODUCTS[listing.productId]?.status ?? "VERIFIED",
    claimedAt: transfer.confirmedAt ?? transfer.createdAt,
  });

  return { listing, transfer };
}

const GRIEVANCES: Grievance[] = [];

export function submitMockGrievance(input: GrievanceSubmission): Grievance {
  const now = new Date().toISOString();
  const grievance: Grievance = {
    grievanceId: generateMockId("GRV"),
    productId: input.productId,
    productName:
      findMockOwnedProduct(input.productId)?.name ?? PRODUCTS[input.productId]?.name ?? "Unknown product",
    category: input.category,
    description: input.description,
    evidenceFileName: input.evidenceFileName ?? null,
    status: "open",
    createdAt: now,
    events: [{ id: generateMockId("EVT"), status: "open", note: "Grievance submitted.", timestamp: now }],
  };
  GRIEVANCES.unshift(grievance);
  return grievance;
}

export function listMockGrievances(): Grievance[] {
  return GRIEVANCES;
}

export function findMockGrievance(grievanceId: string): Grievance | null {
  return GRIEVANCES.find((entry) => entry.grievanceId === grievanceId) ?? null;
}
