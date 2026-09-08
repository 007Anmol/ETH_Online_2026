import { NextResponse } from "next/server";
import { authorizePaidRequest } from "@/lib/paidApi";
import { supabaseRequest } from "../../../../services/agent/src/supabase";

export async function GET(request: Request) {
  try {
    const paid = await authorizePaidRequest(request, "CONSUMER_VERIFICATION");
    if (paid.response) return paid.response;
    const productId = new URL(request.url).searchParams.get("productId");
    if (!productId || !/^\d+$/.test(productId)) return NextResponse.json({ error: "Valid productId is required" }, { status: 400 });
    const [shipments, anomalies] = await Promise.all([
      supabaseRequest<unknown[]>(`shipments?product_id=eq.${productId}&order=created_at.desc`),
      supabaseRequest<unknown[]>(`anomalies?product_id=eq.${productId}&order=created_at.desc&limit=1`),
    ]);
    return NextResponse.json({ productId, verified: anomalies.length === 0, shipments, latestAnomaly: anomalies[0] ?? null, paymentRequestId: paid.payment.requestId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 503 });
  }
}