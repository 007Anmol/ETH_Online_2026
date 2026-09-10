"use client";

import { useCallback, useEffect, useState } from "react";
import { ownershipProvider, productDataProvider } from "@/lib/consumer/providers";
import type { ConsumerProduct, OwnedProduct } from "@/lib/consumer/types";

export type CollectionItem = OwnedProduct & { product: ConsumerProduct | null };
export type CollectionStatus = "loading" | "loaded" | "error";

/**
 * `OwnedProduct` (from `ownershipProvider`) only carries claim metadata, not
 * category/manufacturer — this enriches each entry with its full
 * `ConsumerProduct` (from `productDataProvider`) for a richer collection
 * card, still going through the same two Phase 1 providers rather than a
 * new data source.
 */
export function useProductCollection() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [status, setStatus] = useState<CollectionStatus>("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const owned = await ownershipProvider.listOwnedProducts();
      const enriched = await Promise.all(
        owned.map(async (item) => ({
          ...item,
          product: await productDataProvider.getProduct(item.productId),
        })),
      );
      setItems(enriched);
      setStatus("loaded");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, status, refresh };
}
