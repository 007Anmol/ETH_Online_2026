import { json } from "@/lib/api/http";
import { hasSupabaseConfig } from "@/lib/supabase";

export function GET() {
  return json({
    ok: true,
    service: "verichain-api",
    phase: 1,
    supabase: hasSupabaseConfig(),
  });
}
