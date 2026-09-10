import { NextResponse } from "next/server";
import { SupabaseStore } from "../../../../../services/agent/src/supabase";

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Valid product UUID is required" }, { status: 400 });
  try {
    return NextResponse.json({ productId, checkpoints: await new SupabaseStore().getCheckpoints(productId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch checkpoints" }, { status: 500 });
  }
}