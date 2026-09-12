import { json } from "@/lib/api/http";
import { clearSession } from "@/lib/session";

/** Clears the real Hedera consumer session cookie set by /auth/complete —
 *  same session store the manufacturer /api/auth/logout route clears, just
 *  invoked from the consumer disconnect flow. Without this, disconnecting
 *  the wallet client-side (Privy logout()) leaves the httpOnly session
 *  cookie intact, so requireConsumer() still considers the browser signed
 *  in until the cookie expires — an inconsistent state. */
export async function POST() {
  await clearSession();
  return json({ ok: true });
}
