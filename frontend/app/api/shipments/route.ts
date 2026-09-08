import { NextResponse } from "next/server";
import { SupabaseStore } from "../../../../services/agent/src/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const sender = searchParams.get("sender") ?? undefined;
    const receiver = searchParams.get("receiver") ?? undefined;

    const store = new SupabaseStore();
    const shipments = await store.getShipments({ productId, status, sender, receiver });

    return NextResponse.json({ shipments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch shipments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.id || !body.product_id || !body.sender || !body.receiver || !body.status) {
      return NextResponse.json(
        { error: "Missing required shipment fields: id, product_id, sender, receiver, status" },
        { status: 400 }
      );
    }

    const store = new SupabaseStore();
    const shipment = await store.saveShipment({
      id: body.id,
      product_id: body.product_id,
      sender: body.sender,
      receiver: body.receiver,
      status: body.status,
      tx_hash: body.tx_hash ?? null,
    });

    return NextResponse.json({ shipment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save shipment" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Shipment id is required" }, { status: 400 });
    }

    const store = new SupabaseStore();
    const shipment = await store.updateShipment(body.id, {
      status: body.status,
      tx_hash: body.tx_hash,
    });

    return NextResponse.json({ shipment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update shipment" },
      { status: 500 }
    );
  }
}
