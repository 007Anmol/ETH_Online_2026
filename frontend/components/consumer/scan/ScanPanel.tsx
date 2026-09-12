"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, ScanLine, X } from "lucide-react";
import { productCategoryLabel } from "@/lib/types";
import { formatDisplayDate } from "@/lib/format";
import { productDataProvider } from "@/lib/consumer/registry";
import { STATUS_PRESENTATION } from "@/lib/consumer/status";
import { listMockProductCatalog } from "@/lib/consumer/mock/mock-data";
import type {
  BlockchainProof,
  ConsumerProduct,
  ProductJourney,
  VerificationResult,
} from "@/lib/consumer/types";
import { ScanScene, type ScanScenePhase } from "@/components/consumer/scan/ScanScene";
import { JourneyTimeline } from "@/components/consumer/scan/JourneyTimeline";
import { BlockchainProofPanel } from "@/components/consumer/scan/BlockchainProofPanel";

const CATALOG = listMockProductCatalog();

type ScanState = {
  phase: ScanScenePhase;
  product: ConsumerProduct | null;
  result: VerificationResult | null;
  journey: ProductJourney | null;
  proof: BlockchainProof | null;
};

const INITIAL_STATE: ScanState = {
  phase: "idle",
  product: null,
  result: null,
  journey: null,
  proof: null,
};

function StepIcon({ status }: { status: "pending" | "checking" | "passed" | "failed" }) {
  if (status === "passed") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
        <Check size={12} className="text-white" strokeWidth={3} />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
        <X size={12} className="text-white" strokeWidth={3} />
      </span>
    );
  }
  if (status === "checking") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--foreground)]">
        <Loader2 size={12} className="animate-spin" />
      </span>
    );
  }
  return <span className="h-5 w-5 rounded-full border border-[var(--border)]" />;
}

export function ScanPanel() {
  const [productId, setProductId] = useState(CATALOG[0]?.productId ?? "");
  const [state, setState] = useState<ScanState>(INITIAL_STATE);

  const selectedCatalogEntry = useMemo(
    () => CATALOG.find((entry) => entry.productId === productId) ?? null,
    [productId],
  );

  const busy = state.phase === "scanning";

  async function runScan() {
    if (!productId || busy) return;

    setState({ ...INITIAL_STATE, phase: "scanning" });

    const [product, result, journey, proof] = await Promise.all([
      productDataProvider.getProduct(productId),
      productDataProvider.verifyProduct(productId),
      productDataProvider.getJourney(productId),
      productDataProvider.getBlockchainProof(productId),
    ]);

    setState({
      phase: result.status,
      product,
      result,
      journey,
      proof,
    });
  }

  function reset() {
    setState(INITIAL_STATE);
  }

  const statusPresentation = state.result
    ? STATUS_PRESENTATION[state.result.status]
    : null;

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:items-start">
      <div className="border border-[var(--border)] bg-[var(--surface)]">
        <div className="aspect-square w-full border-b border-[var(--border)] bg-[var(--surface-muted)]">
          <ScanScene phase={state.phase} />
        </div>

        <div className="p-6">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            Product to check
          </label>
          <select
            value={productId}
            onChange={(event) => {
              setProductId(event.target.value);
              reset();
            }}
            disabled={busy}
            className="mt-2 h-11 w-full rounded-none border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--foreground)]"
          >
            {CATALOG.map((entry) => (
              <option key={entry.productId} value={entry.productId}>
                {entry.name} · {entry.productCode}
              </option>
            ))}
          </select>

          {selectedCatalogEntry ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              {selectedCatalogEntry.manufacturer} · {selectedCatalogEntry.origin}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void runScan()}
            disabled={busy || !productId}
            className="btn-accent mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-medium disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Scanning…
              </>
            ) : (
              <>
                <ScanLine size={16} />
                Scan this product
              </>
            )}
          </button>

          {state.result ? (
            <ol className="mt-6 space-y-3">
              {state.result.steps.map((step) => (
                <li key={step.id} className="flex items-center gap-3 text-sm">
                  <StepIcon status={step.status} />
                  <span
                    className={
                      step.status === "failed"
                        ? "text-red-600"
                        : step.status === "pending"
                          ? "text-[var(--muted)]"
                          : ""
                    }
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        {statusPresentation && state.result ? (
          <div className="border border-[var(--border)] bg-[var(--surface)] p-6">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusPresentation.badgeClassName}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusPresentation.dotClassName}`} />
              {statusPresentation.label}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {state.result.summary}
            </p>

            {state.product ? (
              <dl className="mt-5 space-y-2.5 border-t border-[var(--border)] pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Product</dt>
                  <dd className="text-right font-medium">{state.product.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Code</dt>
                  <dd className="text-right font-mono text-xs">
                    {state.product.productCode}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Category</dt>
                  <dd className="text-right font-medium">
                    {productCategoryLabel(state.product.category)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Manufacturer</dt>
                  <dd className="text-right font-medium">
                    {state.product.manufacturer}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Origin</dt>
                  <dd className="text-right font-medium">{state.product.origin}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Manufactured</dt>
                  <dd className="text-right font-medium">
                    {formatDisplayDate(state.product.manufacturingDate)}
                  </dd>
                </div>
              </dl>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full min-h-[220px] items-center justify-center border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
            Pick a product and tap &ldquo;Scan this product&rdquo; to see its
            identity, journey, and blockchain proof.
          </div>
        )}

        {state.journey ? <JourneyTimeline journey={state.journey} /> : null}
        {state.proof ? <BlockchainProofPanel proof={state.proof} /> : null}
      </div>
    </div>
  );
}
