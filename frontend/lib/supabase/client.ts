import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let browserClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

/** Browser-safe Supabase client (anon key). Singleton — avoids GoTrue multi-instance warnings. */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to frontend/.env.local and restart `npm run dev`.",
    );
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: "verichain-browser-auth",
      },
    });
  }

  return browserClient;
}

export function hasBrowserSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Server-only service client. Import only from Route Handlers / server modules.
 * Prefer dynamic import of this helper from API routes, never from Client Components.
 */
export function createServiceSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. These are server-only — never expose the service role to the browser.",
    );
  }

  if (!serviceClient) {
    serviceClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: "verichain-service-auth",
      },
    });
  }

  return serviceClient;
}

export function hasServiceSupabaseConfig(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
