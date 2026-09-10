import "server-only";

import { cookies } from "next/headers";
import {
  CHALLENGE_COOKIE,
  CHALLENGE_TTL_SECONDS,
  createWalletChallenge,
  parseWalletChallengeCookie,
  type WalletChallenge,
} from "@/lib/auth/wallet-challenge-token";

export type { WalletChallenge };

const consumedNonces = new Map<string, number>();

function markChallengeConsumed(nonce: string, expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  for (const [usedNonce, expiry] of consumedNonces) {
    if (expiry < now) consumedNonces.delete(usedNonce);
  }
  if (consumedNonces.has(nonce)) return false;
  consumedNonces.set(nonce, expiresAt);
  return true;
}

export async function issueWalletChallenge(walletAddress: string) {
  const { challenge, cookieValue } = createWalletChallenge(walletAddress);
  const store = await cookies();
  store.set(CHALLENGE_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
  return challenge;
}

export async function consumeWalletChallenge(): Promise<WalletChallenge | null> {
  const store = await cookies();
  const raw = store.get(CHALLENGE_COOKIE)?.value;
  store.delete(CHALLENGE_COOKIE);
  const challenge = parseWalletChallengeCookie(raw);
  if (!challenge) return null;
  if (!markChallengeConsumed(challenge.nonce, challenge.expiresAt)) return null;
  return challenge;
}
