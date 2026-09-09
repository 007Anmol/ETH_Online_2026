"use client";

import { BoundProductSelect } from "@/components/bound-product-select";
import { VerifyResult } from "@/components/verify-result";
import { useNfcDemo } from "@/lib/nfc/use-nfc-demo";
import type { BindableProduct } from "@/lib/nfc/product-summary";
import type { NfcTapPayload } from "@/lib/types";

type ScanPanelProps = {
  products: BindableProduct[];
  initialPayload?: NfcTapPayload | null;
};

export function ScanPanel({ products, initialPayload = null }: ScanPanelProps) {
  const demo = useNfcDemo(products, { initialPayload });

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Phone tap (demo)</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600">
          Judges have no chip. First tap is a new scan. Scan again sends the
          same tap and should warn.
        </p>

        <BoundProductSelect
          label="Product with a bound chip"
          bound={demo.bound}
          productId={demo.productId}
          onChange={demo.setProductId}
        />

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void demo.authenticTap()}
            disabled={!demo.selected || demo.busy !== null}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {demo.busy === "authentic" ? "Checking…" : "First tap — check if genuine"}
          </button>
          <button
            type="button"
            onClick={() => void demo.replayTap()}
            disabled={!demo.lastPayload || demo.busy !== null}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-60"
          >
            {demo.busy === "replay" ? "Checking…" : "Scan the same tap again"}
          </button>
        </div>
        {demo.error ? (
          <p className="mt-3 text-sm text-red-700">{demo.error}</p>
        ) : null}
      </section>

      <section>
        {demo.result ? (
          <VerifyResult view={demo.result} />
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
            Result appears here after a tap. The page does not decide
            authentic or duplicate — the API does.
          </div>
        )}
      </section>
    </div>
  );
}
