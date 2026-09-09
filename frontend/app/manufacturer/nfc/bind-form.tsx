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
        className="rounded-xl border border-zinc-200 bg-white p-6"
      >
        <h2 className="text-sm font-semibold text-zinc-900">Attach a tag</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Choose an unbound product and a hex tag UID (8–20 characters).
        </p>

        <label className="mt-5 block text-sm font-medium text-zinc-700">
          Product
          <select
            required
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            disabled={pending.length === 0}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
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

        <label className="mt-4 block text-sm font-medium text-zinc-700">
          Tag UID
          <input
            required
            value={tagUid}
            onChange={(event) => setTagUid(event.target.value)}
            placeholder="04AABBCCDD02"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={submitting || pending.length === 0}
          className="mt-5 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {submitting ? "Binding…" : "Bind tag"}
        </button>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
            {success}
          </p>
        ) : null}
      </form>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Already bound</h2>
        {bound.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No tags bound yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {bound.map((product) => (
              <li
                key={product.id}
                className="rounded-lg border border-zinc-100 px-3 py-2"
              >
                <div className="font-medium text-zinc-900">
                  {productPickerLabel(product)}
                </div>
                <div className="font-mono text-xs text-zinc-500">
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
