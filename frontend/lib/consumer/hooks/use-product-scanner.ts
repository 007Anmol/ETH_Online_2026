"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { productDataProvider } from "@/lib/consumer/providers";
import { verifyNfcTapPayload } from "@/lib/consumer/adapters/nfc-tap-adapter";
import type { ConsumerProduct, VerificationRun } from "@/lib/consumer/types";
import type { NfcTapPayload } from "@/lib/types";

export type ScannerState =
  | "idle"
  | "reading"
  | "identified"
  | "verifying"
  | "result"
  | "error";

export type ScanSource = "demo" | "tap" | null;

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Drives the full scan → identify → verify → result sequence for both the
 * deterministic demo catalog and a real NFC tap payload, converging on the
 * same `VerificationRun` shape so the UI has one state machine to render.
 */
export function useProductScanner(initialTapPayload: NfcTapPayload | null = null) {
  const [state, setState] = useState<ScannerState>("idle");
  const [source, setSource] = useState<ScanSource>(null);
  const [product, setProduct] = useState<ConsumerProduct | null>(null);
  const [run, setRun] = useState<VerificationRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSet = useCallback(<T,>(setter: (value: T) => void, value: T) => {
    if (mountedRef.current) setter(value);
  }, []);

  const reset = useCallback(() => {
    safeSet(setState, "idle");
    safeSet(setSource, null);
    safeSet(setProduct, null);
    safeSet(setRun, null);
    safeSet(setError, null);
  }, [safeSet]);

  const startDemoScan = useCallback(
    async (rawId: string) => {
      const productId = rawId.trim().toUpperCase();
      if (!productId) {
        safeSet(setError, "Enter a product ID to scan.");
        return;
      }

      safeSet(setError, null);
      safeSet(setSource, "demo");
      safeSet(setState, "reading");

      try {
        const found = await productDataProvider.getProduct(productId);

        if (!found) {
          const notFoundRun = await productDataProvider.verifyProduct(productId);
          safeSet(setProduct, null);
          safeSet(setRun, notFoundRun);
          safeSet(setState, "result");
          return;
        }

        safeSet(setProduct, found);
        safeSet(setState, "identified");
        await pause(500);

        safeSet(setState, "verifying");
        const verifyRun = await productDataProvider.verifyProduct(productId);
        safeSet(setRun, verifyRun);
        safeSet(setState, "result");
      } catch {
        safeSet(setError, "Something went wrong while scanning. Please try again.");
        safeSet(setState, "error");
      }
    },
    [safeSet],
  );

  const startTapScan = useCallback(
    async (payload: NfcTapPayload) => {
      safeSet(setError, null);
      safeSet(setSource, "tap");
      safeSet(setState, "reading");

      try {
        const { product: tapProduct, run: tapRun } = await verifyNfcTapPayload(payload);

        safeSet(setProduct, tapProduct);
        safeSet(setState, "identified");
        await pause(500);

        safeSet(setState, "verifying");
        await pause(400);
        safeSet(setRun, tapRun);
        safeSet(setState, "result");
      } catch {
        safeSet(setError, "Could not verify this tap. Please try again.");
        safeSet(setState, "error");
      }
    },
    [safeSet],
  );

  useEffect(() => {
    if (initialTapPayload) {
      void startTapScan(initialTapPayload);
    }
    // Deep-link payload is fixed for this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, source, product, run, error, startDemoScan, startTapScan, reset };
}
