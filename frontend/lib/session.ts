import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/constants";
import type { Session } from "@/lib/types";

export type { Session };

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.walletAddress || !parsed.role || !parsed.profileId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setSession(session: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
