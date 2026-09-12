import type { GrievanceProvider } from "@/lib/consumer/providers";
import {
  findMockGrievance,
  listMockGrievances,
  submitMockGrievance,
} from "@/lib/consumer/mock/mock-data";

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class MockGrievanceProvider implements GrievanceProvider {
  async submitGrievance(input: Parameters<GrievanceProvider["submitGrievance"]>[0]) {
    const grievance = submitMockGrievance(input);
    return delay(grievance, 700);
  }

  async listGrievances() {
    return delay(listMockGrievances(), 300);
  }

  async getGrievance(grievanceId: string) {
    return delay(findMockGrievance(grievanceId), 250);
  }
}
