import { json, readJson } from "@/lib/api/http";
import { verifyPrivyAccessToken } from "@/lib/auth/privy";
import { extractEthereumWallet, getPrivyUser } from "@/lib/auth/privy-user";
import { consumeWalletChallenge } from "@/lib/auth/wallet-challenge";
import { createServiceClient } from "@/lib/supabase";
import { setSession } from "@/lib/session";
import type { Database, Session } from "@/lib/types";
import { recoverMessageAddress } from "viem";

type CompleteAuthBody = {
  privyAccessToken?: string;
  walletAddress?: string;
  walletMessage?: string;
  walletSignature?: string;
};

function normalizeWalletAddress(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Step 2 of real consumer wallet sign-in. Same signature-verification
 * primitives as `/api/auth/complete` (Privy token + wallet challenge +
 * `recoverMessageAddress`) — deliberately WITHOUT the World ID requirement,
 * which is a manufacturer-only policy. Unlike the manufacturer flow, a
 * consumer profile is auto-provisioned on first sign-in rather than
 * requiring pre-registration by an admin, since consumers self-serve.
 *
 * Known limitation (documented, not hidden): this trusts that Privy's own
 * wallet-connection flow means the user controls the wallet, backed up by
 * an actual signed challenge here — the same strength as the manufacturer
 * flow minus World ID, not a weaker mechanism.
 */
export async function POST(request: Request) {
  const parsed = await readJson<CompleteAuthBody>(request);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);

  const { privyAccessToken, walletAddress, walletMessage, walletSignature } = parsed.body;

  if (!privyAccessToken || !walletAddress || !walletMessage || !walletSignature) {
    return json({ error: "Privy authentication and wallet signature are required" }, 400);
  }

  try {
    const { userId } = await verifyPrivyAccessToken(privyAccessToken);
    const privyWalletAddress = extractEthereumWallet(await getPrivyUser(userId));

    if (!privyWalletAddress) {
      return json({ error: "No Ethereum wallet is linked to this Privy account" }, 403);
    }

    const challenge = await consumeWalletChallenge();
    if (!challenge || challenge.message !== walletMessage) {
      return json({ error: "Wallet challenge is missing, expired, or invalid" }, 401);
    }

    const normalizedWallet = normalizeWalletAddress(walletAddress);
    if (challenge.walletAddress !== normalizedWallet) {
      return json({ error: "Wallet does not match the issued challenge" }, 401);
    }
    if (challenge.walletAddress !== privyWalletAddress.trim().toLowerCase()) {
      return json({ error: "Wallet does not match the Privy account" }, 401);
    }
    if (!/^0x[0-9a-fA-F]+$/.test(walletSignature)) {
      return json({ error: "Invalid wallet signature format" }, 401);
    }

    const recoveredAddress = await recoverMessageAddress({
      message: walletMessage,
      signature: walletSignature as `0x${string}`,
    });

    if (recoveredAddress.toLowerCase() !== challenge.walletAddress) {
      return json({ error: "Wallet signature verification failed" }, 401);
    }

    const supabase = createServiceClient();
    const { data: existing, error: lookupError } = await supabase
      .from("profiles")
      .select("id, wallet_address, organization_id, role, display_name")
      .eq("wallet_address", normalizedWallet)
      .maybeSingle();

    if (lookupError) {
      console.error("[consumer/auth/complete] profile lookup failed", lookupError);
      return json({ error: "Could not load consumer profile" }, 500);
    }

    let profile = existing;

    if (!profile) {
      const insert: Database["public"]["Tables"]["profiles"]["Insert"] = {
        wallet_address: normalizedWallet,
        organization_id: null,
        role: "CONSUMER",
        world_id_verified: false,
        display_name: `${normalizedWallet.slice(0, 6)}…${normalizedWallet.slice(-4)}`,
      };
      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert(insert)
        .select("id, wallet_address, organization_id, role, display_name")
        .single();

      if (insertError || !created) {
        console.error("[consumer/auth/complete] profile creation failed", insertError);
        return json({ error: "Could not create consumer profile" }, 500);
      }
      profile = created;
    } else if (profile.role !== "CONSUMER") {
      return json(
        { error: "This wallet is already registered with a different role" },
        403,
      );
    }

    const session: Session = {
      walletAddress: profile.wallet_address,
      role: profile.role,
      profileId: profile.id,
      organizationId: profile.organization_id,
      displayName: profile.display_name,
    };

    await setSession(session);

    return json({
      authenticated: true,
      session: {
        walletAddress: session.walletAddress,
        role: session.role,
        displayName: session.displayName,
      },
    });
  } catch (error) {
    console.error("[consumer/auth/complete] failed", error);
    return json(
      { error: error instanceof Error ? error.message : "Authentication failed" },
      401,
    );
  }
}
