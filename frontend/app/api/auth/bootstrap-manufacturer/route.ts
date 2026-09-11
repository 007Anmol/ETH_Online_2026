import { NextRequest, NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  hasServiceSupabaseConfig,
  walletHasPermission,
} from "@/lib/supabase";

function normalizeWallet(wallet: string): string {
  return wallet.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  if (!hasServiceSupabaseConfig()) {
    return NextResponse.json(
      { error: "Server Supabase is not configured." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { wallet?: string };
  const wallet = body.wallet ? normalizeWallet(body.wallet) : "";
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "wallet must be a 0x EVM address" }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .upsert(
      {
        name: "Hedera Test Manufacturer",
        type: "MANUFACTURER",
        wallet_address: wallet,
        world_id_verified: false,
      },
      { onConflict: "wallet_address" },
    )
    .select("id")
    .single();

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      wallet_address: wallet,
      organization_id: organization.id,
      role: "MANUFACTURER",
      world_id_verified: false,
      display_name: "Hedera Test Manufacturer",
    },
    { onConflict: "wallet_address" },
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const permissions = [
    "CREATE_BATCH",
    "MINT_PRODUCT",
    "REGISTER_TAG",
    "VIEW_PROVENANCE",
  ] as const;

  const { error: permError } = await supabase.from("role_permissions").upsert(
    permissions.map((permission) => ({ role: "MANUFACTURER", permission })),
    { onConflict: "role,permission" },
  );

  if (permError) {
    return NextResponse.json({ error: permError.message }, { status: 500 });
  }

  const access = await walletHasPermission(supabase, wallet, "CREATE_BATCH");
  return NextResponse.json({ ok: true, wallet, ...access });
}
