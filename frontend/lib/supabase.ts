import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to frontend/.env.local (server only — never NEXT_PUBLIC_).`,
    );
  }
  return value;
}

/**
 * Service-role client. Bypasses RLS. Use only in Route Handlers, Server
 * Actions, and scripts — never import this file from a Client Component.
 */
export function createServiceClient(): SupabaseClient<Database> {
  return createClient<Database>(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
