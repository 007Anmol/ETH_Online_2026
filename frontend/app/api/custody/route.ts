import { NextResponse } from "next/server";
import { SupabaseStore } from "../../../../services/agent/src/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "productId parameter is required" }, { status: 400 });
    }

    const store = new SupabaseStore();
    const transfers = await store.getCustodyTransfers(productId);

    return NextResponse.json({ productId, transfers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch custody transfers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.product_id || !body.from_org_id || !body.to_org_id) {
      return NextResponse.json(
        { error: "Missing required fields: product_id, from_org_id, to_org_id" },
        { status: 400 }
      );
    }

    const store = new SupabaseStore();
    const transfer = await store.saveCustodyTransfer({
      product_id: body.product_id,
      from_org_id: body.from_org_id,
      to_org_id: body.to_org_id,
      chain_tx_hash: body.chain_tx_hash ?? null,
    });

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record custody transfer" },
      { status: 500 }
    );
  }
}
