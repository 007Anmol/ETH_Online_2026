"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type CreateBatchInput,
  type ProductCategory,
} from "@/lib/types";

export function CreateBatchForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateBatchInput>({
    product_name: "",
    batch_code: "",
    plant_id: "",
    quantity: 3,
    product_category: "WATCHES",
  });

  function set<K extends keyof CreateBatchInput>(key: K, value: CreateBatchInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const body = await res.json() as { error?: string };

    if (!res.ok) {
      setError(body.error ?? "Failed to create batch");
      setPending(false);
      return;
    }

    router.push("/manufacturer/batches");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Product name */}
      <Field label="Product name" required>
        <input
          id="product_name"
          type="text"
          placeholder="e.g. RADO Captain Cook"
          value={form.product_name}
          onChange={(e) => set("product_name", e.target.value)}
          required
          className="input"
        />
      </Field>

      {/* Batch code */}
      <Field label="Batch code" required hint="Must be unique. Demo: RADO-2026-001">
        <input
          id="batch_code"
          type="text"
          placeholder="RADO-2026-001"
          value={form.batch_code}
          onChange={(e) => set("batch_code", e.target.value)}
          required
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        {/* Plant ID */}
        <Field label="Plant ID" required>
          <input
            id="plant_id"
            type="text"
            placeholder="PLANT-CH-01"
            value={form.plant_id}
            onChange={(e) => set("plant_id", e.target.value)}
            required
            className="input"
          />
        </Field>

        {/* Quantity */}
        <Field label="Quantity" required hint="1–100">
          <input
            id="quantity"
            type="number"
            min={1}
            max={100}
            value={Number.isFinite(form.quantity) ? form.quantity : ""}
            onChange={(e) => set("quantity", parseInt(e.target.value, 10))}
            required
            className="input"
          />
        </Field>
      </div>

      <Field label="Product category" required hint="Luxury items">
        <select
          id="product_category"
          value={form.product_category}
          onChange={(e) => set("product_category", e.target.value as ProductCategory)}
          required
          className="input"
        >
          {PRODUCT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {PRODUCT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </Field>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create batch"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
        {hint && <span className="ml-1.5 font-normal text-zinc-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
