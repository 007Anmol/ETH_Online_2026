"use client";

import { useEffect, useMemo, useState } from "react";
import type { VerifyView } from "@/components/verify-result";
import { requestSimulate, requestVerify } from "@/lib/nfc/client-api";
import { defaultBoundProductId, type BindableProduct } from "@/lib/nfc/product-summary";
import { UNKNOWN_TAP_PAYLOAD } from "@/lib/nfc/tap-payload";
import type { NfcTapPayload } from "@/lib/types";

export function useNfcDemo(
  products: BindableProduct[],
  options: {
    initialResult?: VerifyView | null;
    initialPayload?: NfcTapPayload | null;
  } = {},
) {
  const { initialResult = null, initialPayload = null } = options;
  const bound = useMemo(
    () => products.filter((product) => product.bound_tag_uid),
    [products],
  );

  const [productId, setProductId] = useState(defaultBoundProductId(products));
  const [lastPayload, setLastPayload] = useState<NfcTapPayload | null>(null);
  const [result, setResult] = useState<VerifyView | null>(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const selected = bound.find((product) => product.id === productId);

  useEffect(() => {
    if (productId && bound.some((product) => product.id === productId)) return;
    setProductId(defaultBoundProductId(products));
  }, [bound, productId, products]);

  async function verifyPayload(payload: NfcTapPayload, failLabel: string) {
    const { ok, data } = await requestVerify(payload);
    if (!ok && !data.result) {
      setError(data.error ?? failLabel);
      return null;
    }
    return data;
  }

  async function run(label: string, work: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await work();
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (!initialPayload) return;
    const key = `verichain.scan:${initialPayload.tag_uid}:${initialPayload.nonce}:${initialPayload.cmac}`;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        setResult(JSON.parse(cached) as VerifyView);
        setLastPayload(initialPayload);
        return;
      }
    } catch {
      /* ignore */
    }

    void run("link", async () => {
      const view = await verifyPayload(initialPayload, "Scan failed");
      if (!view) return;
      setResult(view);
      setLastPayload(initialPayload);
      try {
        sessionStorage.setItem(key, JSON.stringify(view));
      } catch {
        /* ignore */
      }
    });
    // Deep-link payload is fixed for this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function authenticTap() {
    const tagUid = selected?.bound_tag_uid;
    if (!tagUid) return Promise.resolve();
    return run("authentic", async () => {
      const { ok, data } = await requestSimulate({ tag_uid: tagUid });
      if (!ok || !data.payload) {
        setError(data.error ?? "Could not create a tap");
        return;
      }
      setLastPayload(data.payload);
      setResult(await verifyPayload(data.payload, "Verify failed"));
    });
  }

  function replayTap() {
    if (!lastPayload) return Promise.resolve();
    return run("replay", async () => {
      setResult(await verifyPayload(lastPayload, "Verify failed"));
    });
  }

  function invalidTap() {
    return run("invalid", async () => {
      setResult(await verifyPayload(UNKNOWN_TAP_PAYLOAD, "Verify failed"));
    });
  }

  return {
    bound,
    productId,
    setProductId,
    selected,
    lastPayload,
    result,
    error,
    busy,
    authenticTap,
    replayTap,
    invalidTap,
  };
}
