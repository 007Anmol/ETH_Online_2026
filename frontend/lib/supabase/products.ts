import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveOnChainId, normalizeTagUid } from "@/lib/blockchain/hashes";
import { getOrganizationByWallet, getProfileByWallet } from "./auth";

async function requireOrg(supabase: SupabaseClient, wallet: string) {
  const organization = await getOrganizationByWallet(supabase, wallet);
  const profile = await getProfileByWallet(supabase, wallet);
  if (!organization || !profile) {
    throw new Error("No manufacturer organization mapped to this wallet. Bootstrap the profile first.");
  }
  return { organization, profile };
}

export async function syncCreatedBatch(
  supabase: SupabaseClient,
  input: { wallet: string; batchCode: string; quantity: number; txHash: string },
) {
  const { organization, profile } = await requireOrg(supabase, input.wallet);
  const batchIdHash = deriveOnChainId(input.batchCode);
  const { data, error } = await supabase
    .from("batches")
    .upsert(
      {
        batch_code: input.batchCode,
        batch_id_hash: batchIdHash,
        manufacturer_org_id: organization.id,
        product_name: input.batchCode,
        product_category: "WATCHES",
        plant_id: "HEDERA-TESTNET",
        manufacturing_date: new Date().toISOString().slice(0, 10),
        quantity: input.quantity,
        minted_count: 0,
        status: "CREATED",
        chain_tx_hash: input.txHash,
        created_by: profile.id,
      },
      { onConflict: "batch_code" },
    )
    .select("id, batch_code, batch_id_hash")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function syncMintedProducts(
  supabase: SupabaseClient,
  input: { wallet: string; batchCode: string; productCodes: string[]; txHash: string },
) {
  const { organization } = await requireOrg(supabase, input.wallet);
  const { data: existing, error: existingError } = await supabase
    .from("batches")
    .select("id, quantity, minted_count")
    .eq("batch_code", input.batchCode)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const batch =
    existing ??
    (await syncCreatedBatch(supabase, {
      wallet: input.wallet,
      batchCode: input.batchCode,
      quantity: Math.max(input.productCodes.length, 1),
      txHash: input.txHash,
    }));

  const rows = input.productCodes.map((productCode) => ({
    product_code: productCode,
    product_id_hash: deriveOnChainId(productCode),
    batch_id: batch.id,
    serial_number: productCode,
    manufacturer_org_id: organization.id,
    status: "MINTED" as const,
    chain_tx_hash: input.txHash,
  }));

  const { data, error } = await supabase
    .from("products")
    .upsert(rows, { onConflict: "product_code" })
    .select("id, product_code, product_id_hash, token_id, status");
  if (error) throw new Error(error.message);

  await supabase
    .from("batches")
    .update({
      minted_count: input.productCodes.length,
      status: "MINTED",
      chain_tx_hash: input.txHash,
    })
    .eq("id", batch.id);

  return { batch, products: data ?? [] };
}

export async function syncBoundTag(
  supabase: SupabaseClient,
  input: { wallet: string; productCode: string; tagUid: string; txHash: string },
) {
  await requireOrg(supabase, input.wallet);
  const tagUid = normalizeTagUid(input.tagUid);
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, product_code, token_id")
    .eq("product_code", input.productCode)
    .maybeSingle();
  if (productError) throw new Error(productError.message);
  if (!product) {
    throw new Error(`Product ${input.productCode} is not in Supabase yet. Mint it first so the row is created automatically.`);
  }

  const { data: tag, error: tagError } = await supabase
    .from("nfc_tags")
    .upsert(
      {
        tag_uid: tagUid,
        tag_id_hash: deriveOnChainId(tagUid),
        product_id: product.id,
        status: "BOUND",
        bound_at: new Date().toISOString(),
        chain_tx_hash: input.txHash,
      },
      { onConflict: "tag_uid" },
    )
    .select("id, tag_uid")
    .single();
  if (tagError) throw new Error(tagError.message);

  await supabase
    .from("products")
    .update({ status: "TAG_BOUND", chain_tx_hash: input.txHash })
    .eq("id", product.id);

  return { product, tag };
}

export async function linkLogisticsToken(
  supabase: SupabaseClient,
  input: { productCode: string; tokenId: number; txHash: string; custodian?: string },
) {
  const { data: product, error: lookupError } = await supabase
    .from("products")
    .select("id, product_code, token_id")
    .eq("product_code", input.productCode)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!product) {
    throw new Error(`No Supabase product for ${input.productCode}. Mint + bind first.`);
  }

  const { data: taken } = await supabase
    .from("products")
    .select("id, product_code")
    .eq("token_id", input.tokenId)
    .neq("id", product.id)
    .maybeSingle();
  if (taken) {
    throw new Error(`token_id ${input.tokenId} is already linked to ${taken.product_code}`);
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      token_id: input.tokenId,
      status: "READY_FOR_DISPATCH",
      chain_tx_hash: input.txHash,
    })
    .eq("id", product.id)
    .select("id, product_code, token_id, status")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("product_events").insert({
    event_type: "PRODUCT_REGISTERED",
    product_id: product.id,
    chain_tx_hash: input.txHash,
    payload: {
      token_id: input.tokenId,
      custodian: input.custodian ?? null,
      product_code: input.productCode,
    },
  });

  return data;
}

export async function recordOwnershipEvent(
  supabase: SupabaseClient,
  input: {
    tokenId: number;
    from: string;
    to: string;
    txHash: string;
    eventType?: "CUSTODY_TRANSFERRED" | "OWNERSHIP_CLAIMED";
    leg?: "logistics" | "sale";
  },
) {
  const { data: product, error } = await supabase
    .from("products")
    .select("id")
    .eq("token_id", input.tokenId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!product) throw new Error(`No product with token_id ${input.tokenId}`);

  const { data: event, error: eventError } = await supabase
    .from("product_events")
    .insert({
      event_type: input.eventType ?? "CUSTODY_TRANSFERRED",
      product_id: product.id,
      chain_tx_hash: input.txHash,
      payload: {
        from: input.from,
        to: input.to,
        token_id: input.tokenId,
        leg: input.leg ?? null,
      },
    })
    .select()
    .single();
  if (eventError) throw new Error(eventError.message);

  await supabase
    .from("products")
    .update({
      status: "OWNED",
      chain_tx_hash: input.txHash,
    })
    .eq("id", product.id);

  return event;
}

export async function getProductByCodeOrToken(
  supabase: SupabaseClient,
  query: { productCode?: string; tokenId?: number },
) {
  let request = supabase
    .from("products")
    .select("id, product_code, product_id_hash, token_id, status, chain_tx_hash, batch_id");
  if (query.productCode) request = request.eq("product_code", query.productCode);
  if (query.tokenId !== undefined) request = request.eq("token_id", query.tokenId);
  const { data, error } = await request.maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function markProductInTransit(
  supabase: SupabaseClient,
  input: { tokenId: number; txHash: string },
) {
  const { data, error } = await supabase
    .from("products")
    .update({ status: "IN_TRANSIT", chain_tx_hash: input.txHash })
    .eq("token_id", input.tokenId)
    .select("id, product_code, token_id, status")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getProductLifecycle(
  supabase: SupabaseClient,
  query: { productCode?: string; tokenId?: number },
) {
  const product = await getProductByCodeOrToken(supabase, query);
  if (!product) {
    return { product: null, events: [], tags: [], batch: null };
  }

  const eventsQuery = supabase
    .from("product_events")
    .select("id, event_type, payload, chain_tx_hash, occurred_at")
    .eq("product_id", product.id)
    .order("occurred_at", { ascending: true });
  const tagsQuery = supabase
    .from("nfc_tags")
    .select("tag_uid, tag_id_hash, status, chain_tx_hash, bound_at")
    .eq("product_id", product.id);
  const batchQuery = product.batch_id
    ? supabase
        .from("batches")
        .select("batch_code, product_name, product_category, manufacturer_org_id, chain_tx_hash, status, plant_id")
        .eq("id", product.batch_id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [{ data: events, error: eventsError }, { data: tags, error: tagsError }, { data: batch, error: batchError }] =
    await Promise.all([eventsQuery, tagsQuery, batchQuery]);
  if (eventsError) throw new Error(eventsError.message);
  if (tagsError) throw new Error(tagsError.message);
  if (batchError) throw new Error(batchError.message);

  return {
    product,
    events: events ?? [],
    tags: tags ?? [],
    batch: batch ?? null,
  };
}
