"use client";

import { useCallback, useEffect, useState } from "react";
import { consumerAuthProvider } from "@/lib/consumer/providers";
import type { ConsumerIdentity, ConsumerLoginMethod } from "@/lib/consumer/types";

export type ConsumerIdentityStatus = "checking" | "idle" | "authenticating" | "error";

/**
 * Single place components read/change consumer sign-in state from. Wraps
 * `consumerAuthProvider` (see lib/consumer/providers) so no component talks
 * to the mock — or, later, the real Privy-backed provider — directly.
 */
export function useConsumerIdentity() {
  const [identity, setIdentity] = useState<ConsumerIdentity | null>(null);
  const [status, setStatus] = useState<ConsumerIdentityStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("checking");
    try {
      const current = await consumerAuthProvider.getIdentity();
      setIdentity(current);
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Could not check your sign-in status.");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (method: ConsumerLoginMethod) => {
    setStatus("authenticating");
    setError(null);
    try {
      const next = await consumerAuthProvider.login(method);
      setIdentity(next);
      setStatus("idle");
      return next;
    } catch {
      setStatus("error");
      setError("Sign-in failed. Please try again.");
      throw new Error("consumer-login-failed");
    }
  }, []);

  const logout = useCallback(async () => {
    await consumerAuthProvider.logout();
    setIdentity(null);
  }, []);

  return { identity, status, error, login, logout, refresh };
}
