import { NextResponse } from "next/server";
import { SupabaseStore } from "../../../../services/agent/src/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") ?? undefined;

    const store = new SupabaseStore();
    const escrows = await store.getEscrows(productId);

    return NextResponse.json({ escrows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch escrows" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.id || !body.product_id || !body.amount || !body.currency || !body.status) {
      return NextResponse.json(
        { error: "Missing required escrow fields: id, product_id, amount, currency, status" },
        { status: 400 }
      );
    }

    const store = new SupabaseStore();
    const escrow = await store.saveEscrow({
      id: body.id,
      product_id: body.product_id,
      buyer_org_id: body.buyer_org_id ?? null,
      seller_org_id: body.seller_org_id ?? null,
      amount: body.amount,
      currency: body.currency,
      status: body.status,
      chain_tx_hash: body.chain_tx_hash ?? null,
    });

    return NextResponse.json({ escrow }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save escrow" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Escrow id is required" }, { status: 400 });
    }

    const store = new SupabaseStore();
    const escrow = await store.updateEscrow(body.id, {
      status: body.status,
      chain_tx_hash: body.chain_tx_hash,
    });

    return NextResponse.json({ escrow });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update escrow" },
      { status: 500 }
    );
  }
}
