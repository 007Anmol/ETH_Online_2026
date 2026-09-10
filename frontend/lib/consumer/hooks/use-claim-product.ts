"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ownershipProvider } from "@/lib/consumer/providers";
import type { ClaimEligibility, ClaimResult } from "@/lib/consumer/types";

export type ClaimStage = "checking" | "idle" | "processing" | "success" | "failure";

/**
 * Drives the claim flow for one product against `ownershipProvider` (Phase 1
 * architecture, unchanged). `eligibility` answers "can this be claimed"
 * (ELIGIBLE / ALREADY_OWNED / NOT_ELIGIBLE); `stage` answers "where is the
 * claim attempt right now".
 */
export function useClaimProduct(productId: string) {
  const [eligibility, setEligibility] = useState<ClaimEligibility | null>(null);
  const [stage, setStage] = useState<ClaimStage>("checking");
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setStage("checking");
    try {
      const current = await ownershipProvider.getClaimEligibility(productId);
      if (!mountedRef.current) return;
      setEligibility(current);
      setStage("idle");
    } catch {
      if (!mountedRef.current) return;
      setStage("failure");
      setError("Could not check whether this product can be claimed.");
    }
  }, [productId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const claim = useCallback(async () => {
    setStage("processing");
    setError(null);
    try {
      const result: ClaimResult = await ownershipProvider.claimProduct(productId);
      if (!mountedRef.current) return;
      if (result.status === "SUCCESS") {
        setStage("success");
        setEligibility("ALREADY_OWNED");
      } else {
        setStage("failure");
        setError(result.error ?? "Something went wrong while claiming this product.");
      }
    } catch {
      if (!mountedRef.current) return;
      setStage("failure");
      setError("Something went wrong while claiming this product.");
    }
  }, [productId]);

  return { eligibility, stage, error, claim, retry: refresh };
}
