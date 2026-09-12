"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getWalletClient } from "@/lib/consumer/chain/hedera-wallet-client";
import type { EthereumWalletLike } from "@/lib/consumer/chain/hedera-wallet-client";

export type HederaSessionStatus = "checking" | "signed_out" | "signing_in" | "signed_in" | "error";

/**
 * Real consumer sign-in: Privy access token + a message signed by the
 * connected wallet's OWN provider (not Privy's `useSignMessage`, which only
 * works for Privy's embedded wallet — this app connects external wallets
 * like MetaMask, per app/providers.tsx's `loginMethods: ["wallet"]`).
 * Establishes the httpOnly session cookie `requireConsumer()` checks.
 */
export function useHederaSession() {
  const { getAccessToken } = usePrivy();
  const [status, setStatus] = useState<HederaSessionStatus>("checking");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("checking");
    try {
      const res = await fetch("/api/auth/session");
      const body = await res.json();
      if (body.session?.role === "CONSUMER") {
        setWalletAddress(body.session.walletAddress);
        setStatus("signed_in");
      } else {
        setStatus("signed_out");
      }
    } catch {
      setStatus("signed_out");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (wallet: EthereumWalletLike) => {
    setStatus("signing_in");
    setError(null);
    try {
      const privyAccessToken = await getAccessToken();
      if (!privyAccessToken) throw new Error("Not signed in to Privy yet.");

      const challengeRes = await fetch("/api/consumer/auth/wallet-challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ privyAccessToken }),
      });
      const challenge = await challengeRes.json();
      if (!challengeRes.ok) throw new Error(challenge.error ?? "Could not start sign-in");

      const walletClient = await getWalletClient(wallet);
      const signature = await walletClient.signMessage({
        account: wallet.address as `0x${string}`,
        message: challenge.message,
      });

      const completeRes = await fetch("/api/consumer/auth/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          privyAccessToken,
          walletAddress: wallet.address,
          walletMessage: challenge.message,
          walletSignature: signature,
        }),
      });
      const completeBody = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeBody.error ?? "Sign-in failed");

      setWalletAddress(completeBody.session.walletAddress);
      setStatus("signed_in");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Sign-in failed");
    }
  }, [getAccessToken]);

  return { status, walletAddress, error, signIn, refresh };
}
