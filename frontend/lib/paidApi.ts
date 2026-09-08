import { HederaMirrorPaymentNetwork } from "../../services/hedera/src/client";
import { authorizeX402, paymentRequiredResponse } from "../../services/hedera/src/x402";
import type { PaidResource } from "../../packages/shared/types/payment";
import { SupabaseStore } from "../../services/agent/src/supabase";

export function paidRequirements(resource: PaidResource) {
  const amount = process.env.X402_PRICE_TINYBAR;
  const network = process.env.X402_NETWORK ?? "hedera-testnet";
  const currency = process.env.X402_CURRENCY ?? "HBAR";
  if (!amount || !/^\d+$/.test(amount)) throw new Error("X402_PRICE_TINYBAR is required");
  return { resource, amount: BigInt(amount), currency, network, expiresAt: Math.floor(Date.now() / 1000) + 300 };
}

export async function authorizePaidRequest(request: Request, resource: PaidResource) {
  const requirements = paidRequirements(resource);
  const decision = await authorizeX402(request, requirements, new HederaMirrorPaymentNetwork(), new SupabaseStore());
  if (!decision.decision.authorized) {
    return { response: decision.decision.status === 402 ? paymentRequiredResponse(requirements) : Response.json({ error: decision.decision.error }, { status: decision.decision.status }) };
  }
  return { payment: decision.decision.payment };
}