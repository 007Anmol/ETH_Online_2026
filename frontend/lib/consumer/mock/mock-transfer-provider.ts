import type { TransferProvider } from "@/lib/consumer/providers";
import {
  confirmMockTransfer,
  createMockTransfer,
  findMockTransfer,
} from "@/lib/consumer/mock/mock-data";

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class MockTransferProvider implements TransferProvider {
  async initiateTransfer(productId: string, toAddress: string) {
    const record = createMockTransfer(productId, toAddress);
    return delay(record, 300);
  }

  async getTransfer(transferId: string) {
    await delay(null, 900);
    return confirmMockTransfer(transferId) ?? findMockTransfer(transferId);
  }
}
