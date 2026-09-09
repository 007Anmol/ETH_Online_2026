import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/constants";
import type { Session } from "@/lib/types";

export type { Session };

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be configured and contain at least 32 characters.",
    );
  }

  return secret;
}

function encodeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

function decodeSession(value: string): Session | null {
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const payload = value.slice(0, separator);
  const receivedSignature = value.slice(separator + 1);

  const expectedSignature = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");

  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<Session>;

    if (
      typeof parsed.walletAddress !== "string" ||
      typeof parsed.role !== "string" ||
      typeof parsed.profileId !== "string"
    ) {
      return null;
    }

    return {
      walletAddress: parsed.walletAddress,
      role: parsed.role as Session["role"],
      profileId: parsed.profileId,
      organizationId: parsed.organizationId ?? null,
      displayName: parsed.displayName ?? null,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;

  if (!raw) return null;

  return decodeSession(raw);
}

export async function setSession(session: Session): Promise<void> {
  const store = await cookies();

  store.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}