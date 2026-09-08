import type {
  PaymentDecision,
  PaymentRequirements,
  PaymentStore,
} from "./payments";
import { verifyPayment } from "./payments";
import type { PaymentNetwork } from "./client";

export type X402Authorization = {
  decision: PaymentDecision;
  requestId: string | null;
};

export async function authorizeX402(
  request: Request,
  requirements: PaymentRequirements,
  network: PaymentNetwork,
  store: PaymentStore,
  now?: number,
): Promise<X402Authorization> {
  const requestId = request.headers.get("x-request-id");
  const proof = request.headers.get("x-payment");

  if (!requestId) {
    return {
      requestId: null,
      decision: { authorized: false, status: 400, error: "X-REQUEST-ID is required" },
    };
  }

  const decision = await verifyPayment(
    proof,
    { ...requirements, expiresAt: requirements.expiresAt },
    network,
    store,
    now,
    requestId,
  );

  return { requestId, decision };
}

export function paymentRequiredResponse(requirements: PaymentRequirements): Response {
  return new Response(
    JSON.stringify({
      error: "Payment required",
      paymentRequirements: {
        resource: requirements.resource,
        amount: requirements.amount.toString(),
        currency: requirements.currency,
        network: requirements.network,
        expiresAt: requirements.expiresAt,
      },
    }),
    {
      status: 402,
      headers: {
        "content-type": "application/json",
        "x-payment-required": "true",
      },
    },
  );
}