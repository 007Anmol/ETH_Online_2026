import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CHALLENGE_COOKIE = "verichain_wallet_challenge";
export const CHALLENGE_TTL_SECONDS = 5 * 60;

export type WalletChallenge = {
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

export function createWalletChallenge(
  walletAddress: string,
  options?: { expiresAt?: number; nonce?: string },
): { challenge: WalletChallenge; cookieValue: string } {
  const nonce = options?.nonce ?? randomBytes(32).toString("hex");
  const expiresAt =
    options?.expiresAt ?? Math.floor(Date.now() / 1000) + CHALLENGE_TTL_SECONDS;
  const normalizedAddress = walletAddress.trim().toLowerCase();
  const message = [
    "VeriChain manufacturer authentication",
    `Wallet: ${normalizedAddress}`,
    `Nonce: ${nonce}`,
    `Expires: ${expiresAt}`,
  ].join("\n");
  const challenge = { nonce, walletAddress: normalizedAddress, message, expiresAt };
  return { challenge, cookieValue: seal(challenge) };
}

export function parseWalletChallengeCookie(
  value: string | undefined,
  now = Math.floor(Date.now() / 1000),
): WalletChallenge | null {
  if (!value) return null;
  const challenge = unseal(value);
  if (!challenge || challenge.expiresAt < now) return null;
  return challenge;
}
