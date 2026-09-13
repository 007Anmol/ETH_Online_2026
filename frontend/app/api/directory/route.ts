import { NextResponse } from "next/server";
import { supabaseRequest } from "../../../../services/agent/src/supabase";

type DirectoryOrganization = { id: string; name: string; wallet_address: string; type: string };
type DirectoryProduct = {
  id: string;
  product_code: string;
  token_id: number | null;
  serial_number: string;
  status: string;
  created_at: string;
  batch?: { product_name?: string | null } | null;
};

export async function GET() {
  try {
    const [organizations, products] = await Promise.all([
      supabaseRequest<DirectoryOrganization[]>("organizations?select=id,name,wallet_address,type&order=name.asc"),
      supabaseRequest<DirectoryProduct[]>("products?select=id,product_code,token_id,serial_number,status,created_at,batch:batches(product_name)&status=neq.CREATED&order=created_at.desc"),
    ]);

    return NextResponse.json({ organizations: organizations ?? [], products: products ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Directory lookup failed" }, { status: 503 });
  }
}