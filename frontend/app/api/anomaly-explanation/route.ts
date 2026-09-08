import { NextResponse } from "next/server";
import { authorizePaidRequest } from "@/lib/paidApi";
import { supabaseRequest } from "../../../../services/agent/src/supabase";

export async function GET(request: Request) {
  try {
    const paid = await authorizePaidRequest(request, "AI_ANOMALY_EXPLANATION");
    if (paid.response) return paid.response;
    const productId = new URL(request.url).searchParams.get("productId");
    if (!productId || !/^\d+$/.test(productId)) return NextResponse.json({ error: "Valid productId is required" }, { status: 400 });
    const rows = await supabaseRequest<unknown[]>(`anomalies?product_id=eq.${productId}&order=created_at.desc`);
    return NextResponse.json({ productId, anomalies: rows, paymentRequestId: paid.payment.requestId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Anomaly explanation failed" }, { status: 503 });
  }
}