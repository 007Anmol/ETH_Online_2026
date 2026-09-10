import type {
  BlockchainProof,
  BlockchainProofState,
  ConsumerProduct,
  JourneyEventState,
  ProductJourney,
  ProductJourneyEvent,
  VerificationOutcome,
  VerificationStep,
  VerificationStepId,
} from "@/lib/consumer/types";

/**
 * Deterministic demo catalogue keyed by product ID. Every ID here always
 * produces the same outcome — required for reliable live demoing. IDs not
 * listed here (e.g. VC-001027) intentionally resolve to NOT_FOUND.
 */
export const DEMO_PRODUCT_IDS = [
  "VC-001024",
  "VC-001025",
  "VC-001026",
  "VC-001027",
  "VC-001028",
  "VC-001029",
] as const;

type Scenario = {
  outcome: VerificationOutcome;
  journeyState: JourneyEventState;
  proofState: BlockchainProofState;
  product: ConsumerProduct;
};

const SCENARIOS: Record<string, Scenario> = {
  "VC-001024": {
    outcome: "VERIFIED",
    journeyState: "NORMAL",
    proofState: "CONFIRMED",
    product: {
      productId: "VC-001024",
      name: "Rado HyperChrome Automatic",
      category: "WATCHES",
      imageUrl: null,
      manufacturerName: "VeriChain Demo Works",
      origin: "Pune, Maharashtra",
      manufacturingDate: "2026-01-14",
      status: "AUTHENTIC",
      chainTxHash: "0x7f2c1a9e4d3b8f6a1c5e9d2b7a4f8c1e6d3b9a5f",
    },
  },
  "VC-001025": {
    outcome: "INCOMPLETE",
    journeyState: "MISSING",
    proofState: "PENDING",
    product: {
      productId: "VC-001025",
      name: "Rado HyperChrome Automatic",
      category: "WATCHES",
      imageUrl: null,
      manufacturerName: "VeriChain Demo Works",
      origin: "Pune, Maharashtra",
      manufacturingDate: "2026-01-18",
      status: "IN_TRANSIT",
      chainTxHash: null,
    },
  },
  "VC-001026": {
    outcome: "SUSPICIOUS",
    journeyState: "ANOMALY",
    proofState: "UNAVAILABLE",
    product: {
      productId: "VC-001026",
      name: "Rado HyperChrome Automatic",
      category: "WATCHES",
      imageUrl: null,
      manufacturerName: "VeriChain Demo Works",
      origin: "Pune, Maharashtra",
      manufacturingDate: "2026-01-10",
      status: "SUSPECT_COUNTERFEIT",
      chainTxHash: null,
    },
  },
  "VC-001028": {
    outcome: "VERIFIED",
    journeyState: "NORMAL",
    proofState: "CONFIRMED",
    product: {
      productId: "VC-001028",
      name: "Rado HyperChrome Automatic",
      category: "WATCHES",
      imageUrl: null,
      manufacturerName: "VeriChain Demo Works",
      origin: "Pune, Maharashtra",
      manufacturingDate: "2025-11-02",
      status: "OWNED",
      chainTxHash: "0x2b6e9c4a7f1d3e8b5c0a9f6d2e7b4c1a8f5d3e9c",
    },
  },
  "VC-001029": {
    outcome: "VERIFIED",
    journeyState: "NORMAL",
    proofState: "CONFIRMED",
    product: {
      productId: "VC-001029",
      name: "Rado HyperChrome Automatic",
      category: "WATCHES",
      imageUrl: null,
      manufacturerName: "VeriChain Demo Works",
      origin: "Pune, Maharashtra",
      manufacturingDate: "2026-02-01",
      status: "SOLD",
      chainTxHash: "0x9d4a2f7c1e6b8d3a5f0c9e2b7a4d1f8c6e3b9a5d",
    },
  },
};

export function getScenario(productId: string): Scenario | null {
  return SCENARIOS[productId] ?? null;
}

const STEP_DEFS: { id: VerificationStepId; label: string }[] = [
  { id: "PRODUCT_IDENTITY", label: "Checking product identity" },
  { id: "MANUFACTURER", label: "Checking manufacturer" },
  { id: "SUPPLY_CHAIN", label: "Checking supply chain" },
  { id: "BLOCKCHAIN_PROOF", label: "Checking blockchain proof" },
];

export const VERIFICATION_SUMMARIES: Record<VerificationOutcome, string> = {
  VERIFIED:
    "This product's identity, manufacturer, and supply chain all check out.",
  INCOMPLETE:
    "Some verification checks could not be completed yet — the record is still catching up.",
  SUSPICIOUS:
    "Evidence for this product does not match its expected record.",
  NOT_FOUND: "No record exists for this product ID.",
};

export function buildVerificationSteps(
  outcome: VerificationOutcome,
): VerificationStep[] {
  if (outcome === "NOT_FOUND") {
    return STEP_DEFS.map((step, index) => ({
      ...step,
      status: index === 0 ? "failed" : "pending",
    }));
  }

  if (outcome === "SUSPICIOUS") {
    return STEP_DEFS.map((step, index) => ({
      ...step,
      status: index < 3 ? "passed" : "failed",
    }));
  }

  if (outcome === "INCOMPLETE") {
    return STEP_DEFS.map((step, index) => ({
      ...step,
      status: index < 2 ? "passed" : index === 2 ? "failed" : "pending",
    }));
  }

  return STEP_DEFS.map((step) => ({ ...step, status: "passed" }));
}

export function buildJourney(
  productId: string,
  journeyState: JourneyEventState,
): ProductJourney {
  const events: ProductJourneyEvent[] = [
    {
      id: "manufacturer",
      label: "Manufactured",
      actor: "VeriChain Demo Works",
      role: "MANUFACTURER",
      location: "Pune, Maharashtra",
      occurredAt: "2026-01-10T09:00:00Z",
      state: "NORMAL",
      description: "Product registered and its digital twin created.",
    },
    {
      id: "quality-check",
      label: "Quality checkpoint",
      actor: "VeriChain Demo Works",
      role: "MANUFACTURER",
      location: "Pune, Maharashtra",
      occurredAt: "2026-01-11T14:00:00Z",
      state: "NORMAL",
      description: "Passed factory quality inspection.",
    },
    {
      id: "distributor",
      label: "Received by distributor",
      actor: "Meridian Distribution Co.",
      role: "DISTRIBUTOR",
      location: "Mumbai, Maharashtra",
      occurredAt: "2026-01-13T10:30:00Z",
      state: "NORMAL",
      description: "Custody transferred to the regional distributor.",
    },
    {
      id: "logistics",
      label: "In transit",
      actor: "Swift Logistics Hub",
      role: "LOGISTICS_PROVIDER",
      location: "Mumbai to Delhi",
      occurredAt: "2026-01-15T06:00:00Z",
      state: "NORMAL",
      description: "Shipment scanned at the logistics checkpoint.",
    },
    {
      id: "retailer",
      label: "Received by retailer",
      actor: "Kalyan Luxury Retail",
      role: "RETAILER",
      location: "Delhi",
      occurredAt: "2026-01-18T11:15:00Z",
      state: "NORMAL",
      description: "Custody transferred to the point of sale.",
    },
    {
      id: "consumer",
      label: "Sold to consumer",
      actor: "Point of sale",
      role: "CONSUMER",
      location: "Delhi",
      occurredAt: "2026-01-20T16:45:00Z",
      state: "NORMAL",
      description: "Product sold and available for an ownership claim.",
    },
  ];

  if (journeyState === "MISSING") {
    events[3] = {
      ...events[3],
      state: "MISSING",
      occurredAt: null,
      description: "Expected logistics checkpoint has not reported yet.",
    };
    events[4] = {
      ...events[4],
      state: "MISSING",
      occurredAt: null,
      description: "Retailer receipt has not been confirmed yet.",
    };
  }

  if (journeyState === "ANOMALY") {
    events[3] = {
      ...events[3],
      state: "ANOMALY",
      location: "Unrecognized checkpoint",
      description:
        "Observed custody event does not match the expected shipment route.",
    };
  }

  return { productId, events };
}

export function buildProof(
  productId: string,
  proofState: BlockchainProofState,
  chainTxHash: string | null,
): BlockchainProof {
  if (proofState === "UNAVAILABLE") {
    return {
      productId,
      state: "UNAVAILABLE",
      network: "Hedera Testnet",
      layer: "L1",
      contractAddress: null,
      transactionHash: null,
      blockNumber: null,
      timestamp: null,
      eventType: null,
    };
  }

  if (proofState === "PENDING") {
    return {
      productId,
      state: "PENDING",
      network: "Hedera Testnet",
      layer: "L1",
      contractAddress: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
      transactionHash: null,
      blockNumber: null,
      timestamp: null,
      eventType: "PRODUCT_REGISTERED",
    };
  }

  return {
    productId,
    state: "CONFIRMED",
    network: "Hedera Testnet",
    layer: "L1",
    contractAddress: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    transactionHash: chainTxHash,
    blockNumber: 4821337,
    timestamp: "2026-01-14T09:12:33Z",
    eventType: "PRODUCT_REGISTERED",
  };
}
