import "server-only";

import { PrivyClient } from "@privy-io/node";

let client: PrivyClient | undefined;

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function getPrivyClient(): PrivyClient {
  if (!client) {
    client = new PrivyClient({
      appId: requiredEnv("NEXT_PUBLIC_PRIVY_APP_ID"),
      appSecret: requiredEnv("PRIVY_APP_SECRET"),
    });
  }

  return client;
}

export async function verifyPrivyAccessToken(
  accessToken: string,
): Promise<{ userId: string }> {
  if (!accessToken) {
    throw new Error("Missing Privy access token");
  }

  const verified = await getPrivyClient()
    .utils()
    .auth()
    .verifyAccessToken(accessToken);

  return {
    userId: verified.user_id,
  };
}