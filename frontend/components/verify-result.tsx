import Link from "next/link";
import { formatDisplayDate } from "@/lib/format";
import { productCategoryLabel, type VerifyProductResponse } from "@/lib/types";
import { HashScanLink } from "@/components/ui/hashscan-link";

export type VerifyView = VerifyProductResponse;

function Fact({
  label,
  value,
  tone = "teal",
}: {
  label: string;
  value?: string;
  tone?: "teal" | "red";
}) {
  const border = tone === "red" ? "border-red-200/80" : "border-teal-200/70";
  const labelClass = tone === "red" ? "text-red-800" : "text-teal-800";
  const valueClass = tone === "red" ? "text-red-950" : "text-teal-950";
  return (
    <div className={`flex justify-between gap-4 border-t ${border} py-2 text-sm first:border-t-0`}>
      <dt className={labelClass}>{label}</dt>
      <dd className={`text-right font-medium ${valueClass}`}>{value || "—"}</dd>
    </div>
  );
}

function productHref(view: VerifyView) {
  if (view.product_code) return `/product/${view.product_code}`;
  if (view.product_id) return `/product/${view.product_id}`;
  return null;
}

function ProductFacts({
  view,
  tone = "teal",
}: {
  view: VerifyView;
  tone?: "teal" | "red";
}) {
  if (!view.product_code && !view.batch_code) return null;
  return (
    <dl className="mt-4">
      <Fact tone={tone} label="Product" value={view.product_name ?? view.product_code} />
      <Fact tone={tone} label="Product code" value={view.product_code} />
      <Fact tone={tone} label="Category" value={productCategoryLabel(view.product_category)} />
      <Fact tone={tone} label="Batch" value={view.batch_code} />
      <Fact tone={tone} label="Date" value={formatDisplayDate(view.manufacturing_date)} />
      <Fact tone={tone} label="Plant" value={view.plant_id} />
    </dl>
  );
}

export function VerifyResult({
  view,
  showProductLink = true,
}: {
  view: VerifyView;
  showProductLink?: boolean;
}) {
  if (view.result === "AUTHENTIC") {
    const href = productHref(view);
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-800">
          Authentic
        </p>
        <h2 className="mt-2 text-xl font-semibold text-teal-950">
          This is a genuine product
        </h2>
        <p className="mt-1 text-sm text-teal-900">
          First tap matched the registered chip.
        </p>
        {view.chain_tx_hash ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-teal-100/50 px-3 py-2 text-sm text-teal-900 border border-teal-200">
            <span className="font-medium text-teal-950">Verified on Hedera:</span>
            <HashScanLink txHash={view.chain_tx_hash} />
          </div>
        ) : null}
        <ProductFacts view={view} />
        {showProductLink && href ? (
          <Link
            href={href}
            className="mt-4 inline-block text-sm font-medium text-teal-900 underline"
          >
            Open product record
          </Link>
        ) : null}
      </div>
    );
  }

  if (view.result === "DUPLICATE") {
    const href = productHref(view);
    return (
      <div className="rounded-xl border-2 border-red-400 bg-red-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
          Warning
        </p>
        <h2 className="mt-2 text-xl font-semibold text-red-950">
          Duplicate scan — do not trust this item
        </h2>
        <p className="mt-2 text-sm leading-6 text-red-950">
          This exact tap was already used. A real first scan succeeds once.
          A second identical scan usually means a copied stamp or a replay.
        </p>
        <p className="mt-3 text-sm font-semibold text-red-900">
          Treat the product as a possible counterfeit until it is checked
          another way.
        </p>
        <ProductFacts view={view} tone="red" />
        {showProductLink && href ? (
          <Link
            href={href}
            className="mt-4 inline-block text-sm font-medium text-red-900 underline"
          >
            Open product record
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-900">
        {view.result === "ERROR" ? "Could not check" : "Not verified"}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-amber-950">
        {view.result === "ERROR"
          ? "The check did not finish"
          : "This tap could not be verified"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-amber-950">
        {view.result === "ERROR"
          ? "Try the scan again. If it keeps failing, the service is unavailable."
          : "The chip may be unknown, copied, or not yet registered."}
      </p>
    </div>
  );
}
