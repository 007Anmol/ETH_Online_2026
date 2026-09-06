import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SESSION_COOKIE } from "../lib/constants";
import type { Database } from "../lib/database.types";
import { loadEnvFiles } from "./load-env";

export const TEST_BASE = process.env.NFC_TEST_BASE_URL ?? "http://localhost:3000";
export const TEST_BATCH_PREFIX = "HARNESS-";

export function createReporter(label: string) {
  let failed = 0;
  const check = (name: string, ok: boolean, detail?: string) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
    if (!ok) failed += 1;
    return ok;
  };
  const finish = () => {
    console.log("");
    console.log(
      failed === 0 ? `${label}: all passed` : `${label}: ${failed} failed`,
    );
    if (failed > 0) process.exit(1);
  };
  return { check, finish };
}

export function serviceClient(): SupabaseClient<Database> {
  loadEnvFiles();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireApp(base = TEST_BASE): Promise<void> {
  try {
    const probe = await fetch(`${base}/api/health`);
    if (!probe.ok) {
      throw new Error(`GET /api/health returned ${probe.status}`);
    }
  } catch (error) {
    console.error(`Could not reach ${base}. Start the app with npm run dev.`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export async function loginCookie(base = TEST_BASE): Promise<string> {
  const res = await fetch(`${base}/api/auth/mock-login`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`mock-login failed (${res.status}): ${await res.text()}`);
  }
  const cookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") ?? ""];
  const session = cookies.find((cookie) =>
    cookie.trim().startsWith(`${SESSION_COOKIE}=`),
  );
  if (!session) {
    throw new Error("mock-login did not set a session cookie");
  }
  return session.split(";")[0]!.trim();
}

export async function deleteHarnessBatches(
  supabase: SupabaseClient<Database>,
  prefix = TEST_BATCH_PREFIX,
) {
  const { data: batches, error } = await supabase
    .from("batches")
    .select("id")
    .like("batch_code", `${prefix}%`);
  if (error) throw new Error(error.message);
  const ids = (batches ?? []).map((row) => row.id);
  if (ids.length === 0) return;

  const { error: productError } = await supabase
    .from("products")
    .delete()
    .in("batch_id", ids);
  if (productError) throw new Error(productError.message);

  const { error: batchError } = await supabase.from("batches").delete().in("id", ids);
  if (batchError) throw new Error(batchError.message);
}
