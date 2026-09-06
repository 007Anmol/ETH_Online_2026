import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./load-env";

function fail(reason: string): never {
  console.log("");
  console.log("Supabase connection: FAILED");
  console.log(`Reason: ${reason}`);
  console.log("");
  process.exit(1);
}

async function check() {
  loadEnvFiles();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    fail("SUPABASE_URL is missing. Add it to frontend/.env.local");
  }
  if (!key) {
    fail("SUPABASE_SERVICE_ROLE_KEY is missing. Add it to frontend/.env.local");
  }
  if (!url.startsWith("https://") || !url.includes("supabase.co")) {
    fail("SUPABASE_URL should look like https://YOUR_PROJECT.supabase.co");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count, error } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true });

  if (error) {
    fail(error.message);
  }

  console.log("");
  console.log("Supabase connection: OK");
  console.log(`Project: ${url}`);
  console.log(`organizations table: reachable (${count ?? 0} rows)`);
  console.log("");
}

check().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : "Unknown error");
});
