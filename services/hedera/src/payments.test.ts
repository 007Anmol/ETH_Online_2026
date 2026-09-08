import { describe, expect, it } from "vitest";
import { verifyPayment, type PaymentStore } from "./payments";
import type { PaymentProof, PaymentRecord } from "../../../packages/shared/types/payment";

class MemoryStore implements PaymentStore {
  records = new Map<string, PaymentRecord>();
  async hasRequest(requestId: string) { return this.records.has(requestId); }
  async save(record: PaymentRecord) { this.records.set(record.requestId, record); }
}

function header(proof: PaymentProof): string {
  return Buffer.from(JSON.stringify(proof)).toString("base64url");
}

const requirements = {
  resource: "PREMIUM_PROVENANCE" as const,
  amount: 100n,
  currency: "HBAR",
  network: "hedera-testnet",
  expiresAt: 2_000,
};

function proof(overrides: Partial<PaymentProof> = {}): PaymentProof {
  return {
    requestId: "request-1",
    resource: "PREMIUM_PROVENANCE",
    payer: "0.0.10",
    amount: "100",
    currency: "HBAR",
    network: "hedera-testnet",
    transactionId: "0.0.10@1.2",
    expiresAt: 1_500,
    ...overrides,
  };
}

describe("x402 payment verification", () => {
  it("rejects unpaid requests", async () => {
    const result = await verifyPayment(null, requirements, { verifyPayment: async () => true }, new MemoryStore(), 1_000);
    expect(result).toMatchObject({ authorized: false, status: 402 });
  });

  it("accepts and persists a valid paid request", async () => {
    const store = new MemoryStore();
    const result = await verifyPayment(header(proof()), requirements, { verifyPayment: async () => true }, store, 1_000, "request-1");
    expect(result).toMatchObject({ authorized: true });
    expect(store.records.get("request-1")?.status).toBe("VERIFIED");
  });

  it("rejects expired requests", async () => {
    const result = await verifyPayment(header(proof({ expiresAt: 999 })), requirements, { verifyPayment: async () => true }, new MemoryStore(), 1_000, "request-1");
    expect(result).toMatchObject({ authorized: false, status: 402, error: "Payment proof expired" });
  });

  it("rejects duplicated requests", async () => {
    const store = new MemoryStore();
    await store.save({ ...proof(), status: "VERIFIED", createdAt: 900 });
    const result = await verifyPayment(header(proof()), requirements, { verifyPayment: async () => true }, store, 1_000, "request-1");
    expect(result).toMatchObject({ authorized: false, status: 409 });
  });
});