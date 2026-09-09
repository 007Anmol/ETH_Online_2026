import { NextResponse } from "next/server";
import { SupabaseStore } from "../../../../services/agent/src/supabase";

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId") ?? undefined;
  if (productId && !/^\d+$/.test(productId)) return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
  try {
    return NextResponse.json({ anomalies: await new SupabaseStore().getAnomalies(productId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch anomalies" }, { status: 500 });
  }
}