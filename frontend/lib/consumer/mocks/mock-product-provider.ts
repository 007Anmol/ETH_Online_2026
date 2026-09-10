import { delay, MOCK_LATENCY_MS } from "@/lib/consumer/mocks/delay";
import {
  buildJourney,
  buildProof,
  buildVerificationSteps,
  getScenario,
  VERIFICATION_SUMMARIES,
} from "@/lib/consumer/mocks/demo-data";
import type { ProductDataProvider } from "@/lib/consumer/providers/types";
import type { VerificationRun } from "@/lib/consumer/types";

/**
 * Mock implementation of ProductDataProvider. The UI depends only on the
 * interface in `providers/types.ts` — this module can be swapped for a
 * real backend-backed provider without touching any component.
 */
export const mockProductProvider: ProductDataProvider = {
  async getProduct(productId) {
    const scenario = getScenario(productId);
    return delay(scenario ? scenario.product : null);
  },

  async verifyProduct(productId) {
    const scenario = getScenario(productId);
    const outcome = scenario?.outcome ?? "NOT_FOUND";

    const run: VerificationRun = {
      productId,
      outcome,
      steps: buildVerificationSteps(outcome),
      summary: VERIFICATION_SUMMARIES[outcome],
      checkedAt: new Date().toISOString(),
    };

    return delay(run, MOCK_LATENCY_MS * 2);
  },

  async getJourney(productId) {
    const scenario = getScenario(productId);
    if (!scenario) return delay(null);
    return delay(buildJourney(productId, scenario.journeyState));
  },

  async getBlockchainProof(productId) {
    const scenario = getScenario(productId);
    if (!scenario) return delay(null);
    return delay(
      buildProof(productId, scenario.proofState, scenario.product.chainTxHash),
    );
  },
};
