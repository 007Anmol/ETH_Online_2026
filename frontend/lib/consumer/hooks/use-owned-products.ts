"use client";

import { useCallback, useEffect, useState } from "react";
import { ownershipProvider } from "@/lib/consumer/providers";
import type { OwnedProduct } from "@/lib/consumer/types";

export type OwnedProductsStatus = "loading" | "loaded" | "error";

/**
 * Reusable across the Home preview widget (Phase 2) and the full My Products
 * page (Phase 5) — both need the same "load the current owner's products"
 * behavior against `ownershipProvider`.
 */
export function useOwnedProducts() {
  const [products, setProducts] = useState<OwnedProduct[]>([]);
  const [status, setStatus] = useState<OwnedProductsStatus>("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const list = await ownershipProvider.listOwnedProducts();
      setProducts(list);
      setStatus("loaded");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { products, status, refresh };
}
