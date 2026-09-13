"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  defaultPendingProductId,
  productPickerLabel,
  type BindableProduct,
} from "@/lib/nfc/product-summary";

type BindFormProps = {
  products: BindableProduct[];
};

export function BindForm({ products }: BindFormProps) {
  const router = useRouter();
  const pending = useMemo(
    () => products.filter((product) => !product.bound_tag_uid),
    [products],
  );
  const bound = useMemo(
    () => products.filter((product) => product.bound_tag_uid),
    [products],
  );

  const [productId, setProductId] = useState(defaultPendingProductId(products));
  const [tagUid, setTagUid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!pending.some((product) => product.id === productId)) {
      setProductId(defaultPendingProductId(products));
    }
  }, [pending, productId, products]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/nfc/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, tag_uid: tagUid }),
      });
      const body = (await response.json()) as {
        error?: string;
        product_code?: string;
        tag_uid?: string;
        status?: string;
      };

      if (!response.ok) {
        setError(body.error ?? "Bind failed");
        return;
      }

      setSuccess(
        `Bound ${body.product_code} to ${body.tag_uid}. Status ${body.status}.`,
      );
      setTagUid("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6"
      >
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Attach a tag</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Choose an unbound product and a hex tag UID (8–20 characters).
        </p>

        <label className="mt-5 block text-sm font-medium text-[var(--foreground)]">
          Product
          <select
            required
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            disabled={pending.length === 0}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
          >
            {pending.length === 0 ? (
              <option value="">No unbound products</option>
            ) : (
              pending.map((product) => (
                <option key={product.id} value={product.id}>
                  {productPickerLabel(product)}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="mt-4 block text-sm font-medium text-[var(--foreground)]">
          Tag UID
          <input
            required
            value={tagUid}
            onChange={(event) => setTagUid(event.target.value)}
            placeholder="04AABBCCDD02"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm text-[var(--foreground)]"
          />
        </label>

        <button
          type="submit"
          disabled={submitting || pending.length === 0}
          className="mt-5 w-full rounded-lg bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] hover:opacity-80 disabled:opacity-60"
        >
          {submitting ? "Binding…" : "Bind tag"}
        </button>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-lg bg-emerald-500/[0.08] px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            {success}
          </p>
        ) : null}
      </form>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Already bound</h2>
        {bound.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No tags bound yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {bound.map((product) => (
              <li
                key={product.id}
                className="rounded-lg border border-[var(--border)] px-3 py-2"
              >
                <div className="font-medium text-[var(--foreground)]">
                  {productPickerLabel(product)}
                </div>
                <div className="font-mono text-xs text-[var(--muted)]">
                  {product.bound_tag_uid}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
