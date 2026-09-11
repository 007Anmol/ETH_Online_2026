import { NextRequest, NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  hasServiceSupabaseConfig,
  walletHasPermission,
} from "@/lib/supabase";
import type { ManufacturerPermission } from "@/lib/blockchain/types";

const ALLOWED: ManufacturerPermission[] = [
  "CREATE_BATCH",
  "MINT_PRODUCT",
  "REGISTER_TAG",
  "VIEW_PROVENANCE",
];

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.trim();
  const permission = request.nextUrl.searchParams.get(
    "permission",
  ) as ManufacturerPermission | null;

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }
  if (!permission || !ALLOWED.includes(permission)) {
    return NextResponse.json({ error: "valid permission is required" }, { status: 400 });
  }
  if (!hasServiceSupabaseConfig()) {
    return NextResponse.json(
      {
        error:
          "Server Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local, then restart npm run dev.",
      },
      { status: 500 },
    );
  }

  try {
    const supabase = createServiceSupabaseClient();
    const result = await walletHasPermission(supabase, wallet, permission);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Permission lookup failed" },
      { status: 500 },
    );
  }
}
