import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const CHALLENGE_COOKIE = "verichain_wallet_challenge";
const CHALLENGE_TTL_SECONDS = 5 * 60;

type WalletChallenge = {
  nonce: string;
  walletAddress: string;
  message: string;
  expiresAt: number;
};

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be configured and contain at least 32 characters.");
  }
  return value;
}

function seal(challenge: WalletChallenge): string {
  const payload = Buffer.from(JSON.stringify(challenge)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function unseal(value: string): WalletChallenge | null {
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const payload = value.slice(0, separator);
  const received = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(
    createHmac("sha256", secret()).update(payload).digest("base64url"),
  );

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<WalletChallenge>;
    if (
      typeof parsed.nonce !== "string" ||
      typeof parsed.walletAddress !== "string" ||
      typeof parsed.message !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }
    return parsed as WalletChallenge;
  } catch {
    return null;
  }
}

export async function issueWalletChallenge(
  walletAddress: string,
  purpose: string = "manufacturer authentication",
) {
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = Math.floor(Date.now() / 1000) + CHALLENGE_TTL_SECONDS;
  const normalizedAddress = walletAddress.trim().toLowerCase();
  const message = [
    `VeriChain ${purpose}`,
    `Wallet: ${normalizedAddress}`,
    `Nonce: ${nonce}`,
    `Expires: ${expiresAt}`,
  ].join("\n");
  const challenge = { nonce, walletAddress: normalizedAddress, message, expiresAt };

  const store = await cookies();
  store.set(CHALLENGE_COOKIE, seal(challenge), {
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

  if (!raw) return null;
  const challenge = unseal(raw);
  if (!challenge || challenge.expiresAt < Math.floor(Date.now() / 1000)) return null;
  return challenge;
}