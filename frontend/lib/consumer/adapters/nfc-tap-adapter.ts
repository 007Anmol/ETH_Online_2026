import { requestVerify } from "@/lib/nfc/client-api";
import type { NfcTapPayload, VerificationResult as TapResult } from "@/lib/types";
import type {
  ConsumerProduct,
  VerificationOutcome,
  VerificationRun,
  VerificationStep,
  VerificationStepId,
} from "@/lib/consumer/types";

/**
 * Bridges a real physical/simulated NFC tap into the consumer verification
 * narrative. Calls the existing, protected `requestVerify` (POST
 * /api/nfc/verify) — the same function `/scan` uses — rather than
 * reimplementing tap verification. This is the swap-in path for real
 * hardware; the deterministic demo catalog (lib/consumer/mocks) is what
 * currently drives the hackathon-safe path in the scanner.
 *
 * The real system returns one atomic AUTHENTIC/DUPLICATE/INVALID/ERROR
 * result with no per-check breakdown, so the mapping below is a judgment
 * call about how to frame that single result across our four-step
 * narrative, not data the backend actually reports step-by-step:
 *  - AUTHENTIC → VERIFIED, every step passes.
 *  - DUPLICATE → SUSPICIOUS. The tag's nonce was already consumed — the
 *    same credential being replayed is exactly the kind of anomaly this
 *    step is meant to catch, so it fails at "blockchain proof".
 *  - INVALID → SUSPICIOUS. The CMAC didn't validate, i.e. the tag isn't a
 *    recognized genuine credential — that fails at "product identity".
 *  - ERROR → INCOMPLETE. The system couldn't complete the check (not a
 *    verdict either way), so it fails at "blockchain proof" but is framed
 *    as incomplete rather than suspicious.
 */

const STEP_DEFS: { id: VerificationStepId; label: string }[] = [
  { id: "PRODUCT_IDENTITY", label: "Checking product identity" },
  { id: "MANUFACTURER", label: "Checking manufacturer" },
  { id: "SUPPLY_CHAIN", label: "Checking supply chain" },
  { id: "BLOCKCHAIN_PROOF", label: "Checking blockchain proof" },
];

function stepsFor(outcome: VerificationOutcome): VerificationStep[] {
  if (outcome === "VERIFIED") {
    return STEP_DEFS.map((step) => ({ ...step, status: "passed" }));
  }

  if (outcome === "SUSPICIOUS") {
    const failIndex = 0; // conservative default for INVALID
    return STEP_DEFS.map((step, index) => ({
      ...step,
      status: index < failIndex ? "passed" : index === failIndex ? "failed" : "pending",
    }));
  }

  // INCOMPLETE
  return STEP_DEFS.map((step, index) => ({
    ...step,
    status: index < 3 ? "passed" : "failed",
  }));
}

function stepsForDuplicate(): VerificationStep[] {
  return STEP_DEFS.map((step, index) => ({
    ...step,
    status: index < 3 ? "passed" : "failed",
  }));
}

function mapTapResult(result: TapResult): {
  outcome: VerificationOutcome;
  summary: string;
  steps: VerificationStep[];
} {
  switch (result) {
    case "AUTHENTIC":
      return {
        outcome: "VERIFIED",
        summary: "This tap matches a genuine, unused product credential.",
        steps: stepsFor("VERIFIED"),
      };
    case "DUPLICATE":
      return {
        outcome: "SUSPICIOUS",
        summary: "This exact credential was already used in a previous scan — a sign of a copied or replayed tag.",
        steps: stepsForDuplicate(),
      };
    case "INVALID":
      return {
        outcome: "SUSPICIOUS",
        summary: "This tag's signature does not match any known genuine product.",
        steps: stepsFor("SUSPICIOUS"),
      };
    case "ERROR":
    default:
      return {
        outcome: "INCOMPLETE",
        summary: "The verification check could not be completed. Please try again.",
        steps: stepsFor("INCOMPLETE"),
      };
  }
}

export async function verifyNfcTapPayload(
  payload: NfcTapPayload,
): Promise<{ product: ConsumerProduct | null; run: VerificationRun }> {
  const { data } = await requestVerify(payload);
  const { outcome, summary, steps } = mapTapResult(data.result);

  const productId = data.product_code ?? data.product_id ?? "unknown";

  const product: ConsumerProduct | null = data.product_id
    ? {
        productId,
        name: data.product_name ?? productId,
        category: data.product_category ?? null,
        imageUrl: null,
        manufacturerName: "Verified manufacturer",
        origin: data.plant_id ?? "Unknown",
        manufacturingDate: data.manufacturing_date ?? null,
        status: null,
        chainTxHash: data.chain_tx_hash ?? null,
      }
    : null;

  const run: VerificationRun = {
    productId,
    outcome,
    steps,
    summary: data.failure_reason ?? summary,
    checkedAt: new Date().toISOString(),
  };

  return { product, run };
}
