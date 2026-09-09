import "server-only";

import { signRequest } from "@worldcoin/idkit-core/signing";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

export type WorldRpContext = {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
};

export async function createWorldRpContext(): Promise<WorldRpContext> {
  const rpId = requiredEnv("WORLD_ID_RP_ID");
  const signingKey = requiredEnv("WORLD_ID_SIGNING_KEY");

  const signedRequest = await signRequest({
    signingKeyHex: signingKey,
    action: requiredEnv("WORLD_ID_ACTION"),
    ttl: 300,
  });

  return {
    rp_id: rpId,
    nonce: signedRequest.nonce,
    created_at: signedRequest.createdAt,
    expires_at: signedRequest.expiresAt,
    signature: signedRequest.sig,
  };
}