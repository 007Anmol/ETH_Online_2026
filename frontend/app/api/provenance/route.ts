import { NextResponse } from "next/server";
import { authorizePaidRequest } from "@/lib/paidApi";
import { supabaseRequest } from "../../../../services/agent/src/supabase";

export async function GET(request: Request) {
  try {
    const paid = await authorizePaidRequest(request, "PREMIUM_PROVENANCE");
    if (paid.response) return paid.response;
    const productId = new URL(request.url).searchParams.get("productId");
    if (!productId || !/^\d+$/.test(productId)) return NextResponse.json({ error: "Valid productId is required" }, { status: 400 });
    const rows = await supabaseRequest<unknown[]>(`checkpoints?product_id=eq.${productId}&order=observed_at.desc`);
    return NextResponse.json({ productId, checkpoints: rows, paymentRequestId: paid.payment.requestId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Provenance query failed" }, { status: 503 });
  }
}