"use client";

import {
  IDKitRequestWidget,
  selfieCheckLegacy,
  type IDKitResult,
} from "@worldcoin/idkit";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

type WorldContextResponse = {
  app_id: string;
  action: string;
  rp_context: {
    rp_id: string;
    nonce: string;
    created_at: number;
    expires_at: number;
    signature: string;
  };
};

type WorldIdResult = IDKitResult;

type WalletChallengeResponse = {
  message?: string;
  walletAddress?: string;
  error?: string;
};

type SignableWallet = {
  address: string;
  sign: (message: string) => Promise<string>;
};

function asSignableWallet(wallet: unknown): SignableWallet | null {
  if (
    !wallet ||
    typeof wallet !== "object" ||
    !("address" in wallet) ||
    !("sign" in wallet)
  ) {
    return null;
  }

  const candidate = wallet as { address?: unknown; sign?: unknown };

  if (typeof candidate.address !== "string" || typeof candidate.sign !== "function") {
    return null;
  }

  return {
    address: candidate.address,
    sign: candidate.sign as (message: string) => Promise<string>,
  };
}

async function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), 30_000);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export function LoginForm() {
  const router = useRouter();
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  const [worldOpen, setWorldOpen] = useState(false);
  const [worldContext, setWorldContext] =
    useState<WorldContextResponse | null>(null);
  const [worldProofReceived, setWorldProofReceived] = useState(false);
  const [walletSignature, setWalletSignature] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function prepareWalletAuthentication() {
    const privyAccessToken = await getAccessToken();
    const connectedWallet = asSignableWallet(wallets[0]);

    if (!privyAccessToken || !connectedWallet) {
      throw new Error("Wallet authentication is incomplete. Please reconnect your wallet and try again.");
    }

    const challengeResponse = await withTimeout(
      fetch("/api/auth/wallet-challenge", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ privyAccessToken }),
      }),
      "Could not start the wallet signature challenge. Please try again.",
    );
    const challengeBody = (await challengeResponse.json()) as WalletChallengeResponse;

    if (!challengeResponse.ok || !challengeBody.message) {
      throw new Error(
        challengeBody.error ?? "Could not create a wallet signature challenge",
      );
    }

    const signingWallet =
      wallets
        .map(asSignableWallet)
        .find(
          (wallet) =>
            wallet &&
            wallet.address.toLowerCase() ===
              challengeBody.walletAddress?.toLowerCase(),
        ) ?? connectedWallet;

    if (!signingWallet) {
      throw new Error("Connected wallet cannot sign the authentication challenge");
    }

    setError("Approve the wallet signature request to continue to World ID.");
    const signature = await signingWallet.sign(challengeBody.message);

    setWalletAddress(signingWallet.address);
    setWalletSignature(signature);
  }

  async function beginWorldIdVerification() {
    setError(null);
    setPending(true);

    try {
      const privyAccessToken = await getAccessToken();

      if (!privyAccessToken) {
        throw new Error("Could not obtain a Privy access token");
      }

      if (!wallets[0]) {
        throw new Error("No connected Ethereum wallet was found");
      }

      const response = await fetch("/api/auth/world-id/context", {
        method: "POST",
      });

      const body = (await response.json()) as
        | WorldContextResponse
        | { error?: string };

      if (!response.ok || !("rp_context" in body)) {
        throw new Error(
          "error" in body
            ? body.error ?? "Could not start World ID verification"
            : "Could not start World ID verification",
        );
      }

      setWorldContext(body);
      setWorldOpen(true);
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Could not start World ID verification",
      );
    } finally {
      setPending(false);
    }
  }

  async function completeAuthentication(proof: WorldIdResult) {
    setError(null);
    setPending(true);

    try {
      const privyAccessToken = await getAccessToken();

      if (!privyAccessToken || !walletAddress || !walletSignature) {
        throw new Error("Wallet authentication is incomplete. Please reconnect your wallet and try again.");
      }

      const response = await withTimeout(
        fetch("/api/auth/complete", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            privyAccessToken,
            worldIdProof: proof,
            walletAddress,
            walletSignature,
          }),
        }),
        "Authentication request timed out. Please try again.",
      );

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Authentication failed");
      }

      router.push("/manufacturer");
      router.refresh();
    } catch (authenticationError) {
      const message =
        authenticationError instanceof Error
          ? authenticationError.message
          : "Authentication failed";
      setError(message);
      throw authenticationError;
    } finally {
      setPending(false);
    }
  }

  async function handleWorldVerify(result: WorldIdResult) {
    setWorldProofReceived(true);
    setWorldOpen(false);
    setError("World ID confirmed. Finishing authentication.");
    await completeAuthentication(result);
  }

  async function beginWalletAndWorldIdVerification() {
    setError(null);
    setPending(true);

    try {
      await prepareWalletAuthentication();
      await beginWorldIdVerification();
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Could not start authentication",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.8,
          delay: 0.2,
          ease: "easeOut",
        }}
        className="relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left shadow-[0_20px_70px_rgba(23,23,23,0.08)] lg:p-8"
      >
        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 bg-emerald-500/[0.08] blur-3xl" />

        <p className="relative z-10 max-w-sm text-sm leading-6 text-[var(--muted)]">
          Verify that you are a unique human, then authenticate the wallet
          registered to your manufacturer profile.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={async () => {
            setError(null);

            if (!ready) {
              setError("Authentication is still loading");
              return;
            }

            if (!authenticated) {
              try {
                await login();
              } catch (loginError) {
                const message =
                  loginError instanceof Error
                    ? loginError.message
                    : String(loginError);
                const isRejectedWalletConnectSession = /reject session/i.test(
                  message,
                );

                if (isRejectedWalletConnectSession) {
                  const connectedWallet = wallets[0];
                  try {
                    connectedWallet?.disconnect();
                  } catch {}

                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                    await logout();
                  } catch {}

                  setError(
                    "WalletConnect rejected its previous session. Reopen the wallet login and approve a new connection.",
                  );
                } else {
                  setError(
                    message ||
                      "Wallet login failed. Choose WalletConnect or enable MetaMask and try again.",
                  );
                }
              }
              return;
            }

            await beginWalletAndWorldIdVerification();
          }}
          disabled={!ready || pending}
          className="relative z-10 mt-7 flex h-12 w-full items-center justify-center rounded-full bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--background)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!ready
            ? "Loading authentication…"
            : pending
              ? "Authenticating…"
              : authenticated
                ? "Verify with World ID"
                : "Connect manufacturer wallet"}
        </motion.button>

        {authenticated && !worldContext && (
          <button
            type="button"
            onClick={beginWalletAndWorldIdVerification}
            disabled={pending}
            className="relative z-10 mt-3 flex h-12 w-full items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--foreground)] disabled:opacity-60"
          >
            Start World ID verification
          </button>
        )}

        {worldProofReceived && (
          <p className="relative z-10 mt-4 text-xs text-emerald-600 dark:text-emerald-400">
            World ID proof received. Approve the wallet signature to finish.
          </p>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="relative z-10 mt-4 border-l-2 border-red-500 pl-3 text-sm leading-6 text-red-600 dark:text-red-400"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {worldContext && (
        <IDKitRequestWidget
          open={worldOpen}
          onOpenChange={setWorldOpen}
          app_id={worldContext.app_id as `app_${string}`}
          action={worldContext.action}
          rp_context={worldContext.rp_context}
          environment="production"
          allow_legacy_proofs={true}
          preset={selfieCheckLegacy({ signal: "manufacturer-login" })}
          handleVerify={handleWorldVerify}
          onSuccess={() => {
            setWorldOpen(false);
          }}
          onError={(errorCode) => {
            setWorldOpen(false);
            setError((currentError) =>
              currentError && currentError !== "World ID confirmed. Approve the wallet signature request to finish."
                ? currentError
                : `World ID verification failed: ${errorCode}`,
            );
          }}
        />
      )}
    </>
  );
}