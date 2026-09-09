import "server-only";

import { PrivyClient } from "@privy-io/node";

let client: PrivyClient | undefined;

function getClient(): PrivyClient {
  if (!client) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error("Privy server configuration is missing");
    }

    client = new PrivyClient({ appId, appSecret });
  }

  return client;
}

export type PrivyEthereumUser = {
  linked_accounts?: Array<{
    type?: string;
    address?: string;
    chain_type?: string;
  }>;
};

export async function getPrivyUser(userId: string): Promise<PrivyEthereumUser> {
  return getClient().users()._get(userId) as Promise<PrivyEthereumUser>;
}

export function extractEthereumWallet(user: PrivyEthereumUser): string | null {
  const wallet = user.linked_accounts?.find(
    (account) =>
      account.type === "wallet" &&
      account.chain_type === "ethereum" &&
      typeof account.address === "string",
  );

  return wallet?.address ?? null;
}