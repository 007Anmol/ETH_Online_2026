import { NextRequest, NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  hasServiceSupabaseConfig,
} from "@/lib/supabase";
import {
  getProductByCodeOrToken,
  getProductLifecycle,
  linkLogisticsToken,
  markProductInTransit,
  recordOwnershipEvent,
  syncBoundTag,
  syncCreatedBatch,
  syncMintedProducts,
} from "@/lib/supabase/products";

export async function GET(request: NextRequest) {
  if (!hasServiceSupabaseConfig()) {
    return NextResponse.json({ error: "Server Supabase is not configured." }, { status: 500 });
  }
  const productCode = request.nextUrl.searchParams.get("productCode") ?? undefined;
  const tokenIdRaw = request.nextUrl.searchParams.get("tokenId");
  const tokenId = tokenIdRaw ? Number(tokenIdRaw) : undefined;
  if (!productCode && tokenId === undefined) {
    return NextResponse.json({ error: "productCode or tokenId is required" }, { status: 400 });
  }
  try {
    const supabase = createServiceSupabaseClient();
    if (request.nextUrl.searchParams.get("details") === "1") {
      const lifecycle = await getProductLifecycle(supabase, { productCode, tokenId });
      return NextResponse.json(lifecycle);
    }
    const product = await getProductByCodeOrToken(supabase, { productCode, tokenId });
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Product lookup failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!hasServiceSupabaseConfig()) {
    return NextResponse.json({ error: "Server Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    wallet?: string;
    batchCode?: string;
    quantity?: number;
    productCodes?: string[];
    productCode?: string;
    tagUid?: string;
    tokenId?: number;
    txHash?: string;
    custodian?: string;
    from?: string;
    to?: string;
    leg?: "logistics" | "sale";
  };

  const supabase = createServiceSupabaseClient();

  try {
    if (body.action === "createBatch") {
      if (!body.wallet || !body.batchCode || !body.quantity || !body.txHash) {
        return NextResponse.json({ error: "wallet, batchCode, quantity, txHash required" }, { status: 400 });
      }
      const batch = await syncCreatedBatch(supabase, {
        wallet: body.wallet,
        batchCode: body.batchCode,
        quantity: body.quantity,
        txHash: body.txHash,
      });
      return NextResponse.json({ ok: true, batch });
    }

    if (body.action === "mintBatch") {
      if (!body.wallet || !body.batchCode || !body.productCodes?.length || !body.txHash) {
        return NextResponse.json({ error: "wallet, batchCode, productCodes, txHash required" }, { status: 400 });
      }
      const result = await syncMintedProducts(supabase, {
        wallet: body.wallet,
        batchCode: body.batchCode,
        productCodes: body.productCodes,
        txHash: body.txHash,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "bindTag") {
      if (!body.wallet || !body.productCode || !body.tagUid || !body.txHash) {
        return NextResponse.json({ error: "wallet, productCode, tagUid, txHash required" }, { status: 400 });
      }
      const result = await syncBoundTag(supabase, {
        wallet: body.wallet,
        productCode: body.productCode,
        tagUid: body.tagUid,
        txHash: body.txHash,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "linkLogistics") {
      if (!body.productCode || !body.tokenId || !body.txHash) {
        return NextResponse.json({ error: "productCode, tokenId, txHash required" }, { status: 400 });
      }
      const product = await linkLogisticsToken(supabase, {
        productCode: body.productCode,
        tokenId: Number(body.tokenId),
        txHash: body.txHash,
        custodian: body.custodian,
      });
      return NextResponse.json({ ok: true, product });
    }

    if (body.action === "inTransit") {
      if (!body.tokenId || !body.txHash) {
        return NextResponse.json({ error: "tokenId, txHash required" }, { status: 400 });
      }
      const product = await markProductInTransit(supabase, {
        tokenId: Number(body.tokenId),
        txHash: body.txHash,
      });
      return NextResponse.json({ ok: true, product });
    }

    if (body.action === "ownership") {
      if (!body.tokenId || !body.from || !body.to || !body.txHash) {
        return NextResponse.json({ error: "tokenId, from, to, txHash required" }, { status: 400 });
      }
      const event = await recordOwnershipEvent(supabase, {
        tokenId: Number(body.tokenId),
        from: body.from,
        to: body.to,
        txHash: body.txHash,
        leg: body.leg,
      });
      return NextResponse.json({ ok: true, event });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Product sync failed" },
      { status: 500 },
    );
  }
}
