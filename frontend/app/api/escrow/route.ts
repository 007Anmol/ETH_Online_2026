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

    if (!body.id || !body.product_id || !body.payer || !body.payee || !body.amount_wei || !body.status) {
      return NextResponse.json(
        { error: "Missing required escrow fields: id, product_id, payer, payee, amount_wei, status" },
        { status: 400 }
      );
    }

    const store = new SupabaseStore();
    const escrow = await store.saveEscrow({
      id: body.id,
      product_id: body.product_id,
      payer: body.payer,
      payee: body.payee,
      amount_wei: body.amount_wei,
      status: body.status,
      tx_hash: body.tx_hash ?? null,
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
      tx_hash: body.tx_hash,
    });

    return NextResponse.json({ escrow });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update escrow" },
      { status: 500 }
    );
  }
}
