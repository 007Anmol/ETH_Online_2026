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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (!authenticated) {
        await login();
        throw new Error("Complete wallet login, then verify World ID again.");
      }

      const privyAccessToken = await getAccessToken();
      const wallet = wallets[0];

      if (!privyAccessToken || !wallet) {
        throw new Error("Wallet authentication expired. Please reconnect your wallet and try again.");
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
            walletAddress: wallet.address,
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
    setError("World ID confirmed. Completing authentication…");
    await completeAuthentication(result);
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
        className="relative mt-8 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-8 text-left shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />

        <p className="relative z-10 text-sm text-zinc-300">
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

            await beginWorldIdVerification();
          }}
          disabled={!ready || pending}
          className="relative z-10 mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-400 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
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
            onClick={beginWorldIdVerification}
            disabled={pending}
            className="relative z-10 mt-3 w-full rounded-xl border border-white/15 px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-white/5 disabled:opacity-60"
          >
            Start World ID verification
          </button>
        )}

        {worldProofReceived && (
          <p className="relative z-10 mt-4 text-xs text-emerald-300">
            World ID proof received. Completing backend verification…
          </p>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="relative z-10 mt-4 text-sm text-red-400"
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