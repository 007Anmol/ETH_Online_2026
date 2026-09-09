"use client";

import { BoundProductSelect } from "@/components/bound-product-select";
import { VerifyResult } from "@/components/verify-result";
import { useNfcDemo } from "@/lib/nfc/use-nfc-demo";
import type { BindableProduct } from "@/lib/nfc/product-summary";

export function SimulatorPanel({ products }: { products: BindableProduct[] }) {
  const demo = useNfcDemo(products, {});

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">NFC simulator</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Authentic creates a new payload, then verifies it. Replay sends the
          exact bytes below. Invalid sends a broken stamp.
        </p>

        <BoundProductSelect
          label="Bound product"
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
            {demo.busy === "authentic" ? "Tapping…" : "Simulate authentic tap"}
          </button>
          <button
            type="button"
            onClick={() => void demo.replayTap()}
            disabled={!demo.lastPayload || demo.busy !== null}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
          >
            {demo.busy === "replay" ? "Replaying…" : "Replay same payload"}
          </button>
          <button
            type="button"
            onClick={() => void demo.invalidTap()}
            disabled={demo.busy !== null}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
          >
            {demo.busy === "invalid" ? "Sending…" : "Invalid tap"}
          </button>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Last payload
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
            {demo.lastPayload
              ? JSON.stringify(demo.lastPayload, null, 2)
              : "No tap yet. Run an authentic tap first."}
          </pre>
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
            Verify result will appear here from the API.
          </div>
        )}
      </section>
    </div>
  );
}
