"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, MessageSquareWarning, PackageCheck, ScanLine, Tag } from "lucide-react";
import { formatDisplayDate } from "@/lib/format";
import { STATUS_PRESENTATION } from "@/lib/consumer/status";
import { ownershipProvider } from "@/lib/consumer/registry";
import type { OwnedProduct } from "@/lib/consumer/types";

export function ProductsList() {
  const [products, setProducts] = useState<OwnedProduct[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void ownershipProvider.listOwnedProducts().then((result) => {
      if (!cancelled) setProducts(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (products === null) {
    return (
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-40 animate-pulse border border-[var(--border)] bg-[var(--surface-muted)]"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-4 border border-dashed border-[var(--border)] p-12 text-center">
        <PackageCheck size={28} className="text-[var(--muted)]" />
        <div>
          <p className="text-sm font-medium">No products claimed yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Scan a product and claim ownership to see it here.
          </p>
        </div>
        <Link
          href="/consumer/scan"
          className="btn-accent inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
        >
          <ScanLine size={16} />
          Scan a product
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, index) => {
        const presentation = STATUS_PRESENTATION[product.status];
        return (
          <motion.div
            key={product.productId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
            className="card-hover group border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <Link href={`/consumer/scan?product=${product.productId}`} className="block">
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] transition-colors group-hover:border-[var(--accent)]"
                  style={{ color: "var(--accent)" }}
                >
                  <PackageCheck size={17} />
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${presentation.badgeClassName}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${presentation.dotClassName}`} />
                  {presentation.label}
                </span>
              </div>

              <p className="mt-4 text-sm font-medium">{product.name}</p>
              <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                {product.productCode}
              </p>
              <p className="mt-3 text-xs text-[var(--muted)]">
                Claimed {formatDisplayDate(product.claimedAt)}
              </p>
            </Link>

            <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-4">
              <Link
                href={`/consumer/products/${product.productId}/transfer`}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] text-xs font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <ArrowLeftRight size={13} />
                Transfer
              </Link>
              <Link
                href={`/consumer/products/${product.productId}/resell`}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] text-xs font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Tag size={13} />
                Resell
              </Link>
              <Link
                href={`/consumer/products/${product.productId}/report`}
                aria-label="Report an issue"
                title="Report an issue"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] transition-colors hover:border-red-400 hover:text-red-500"
              >
                <MessageSquareWarning size={14} />
              </Link>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
