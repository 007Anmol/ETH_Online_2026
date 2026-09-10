import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getManufacturerProduct } from "@/lib/manufacturing";
import { getSession } from "@/lib/session";
import { productCategoryLabel } from "@/lib/types";
import { RevokeButton } from "./revoke-button";
import { HashScanLink } from "@/components/ui/hashscan-link";

export const metadata = { title: "Product detail — VeriChain" };

type Props = { params: Promise<{ id: string }> };

export default async function ProductDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = session.organizationId
    ? await getManufacturerProduct(id, session.organizationId)
    : null;

  if (!result) notFound();

  const { product, batch } = result;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/manufacturer" className="hover:text-zinc-700">Dashboard</Link>
        <span>›</span>
        <Link href="/manufacturer/products" className="hover:text-zinc-700">Products</Link>
        <span>›</span>
        <span className="font-mono text-zinc-900">{product.product_code}</span>
      </nav>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-zinc-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-mono text-lg font-semibold text-zinc-900">{product.product_code}</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Serial: <span className="font-mono">{product.serial_number}</span>
              </p>
            </div>
            <StatusBadge status={product.status} />
          </div>
        </div>

        {/* Product fields */}
        <div className="px-6 py-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Product identity
          </h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Field label="Product code" value={product.product_code} mono />
            <Field label="Status" value={product.status} />
            <Field label="Serial number" value={product.serial_number} mono />
            <Field label="Created" value={new Date(product.created_at).toLocaleString()} />
            <div>
              <dt className="text-xs font-medium text-zinc-400">Chain TX</dt>
              <dd className="mt-0.5">
                {product.chain_tx_hash ? <HashScanLink txHash={product.chain_tx_hash} /> : <span className="font-mono text-xs text-zinc-800">—</span>}
              </dd>
            </div>
            <Field label="Token ID" value={product.token_id?.toString() ?? "—"} />
          </dl>
        </div>

        {/* Batch fields */}
        <div className="border-t border-zinc-100 px-6 py-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Batch
          </h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Field label="Batch code" value={batch.batch_code} mono />
            <Field label="Batch status" value={batch.status} />
            <Field label="Product name" value={batch.product_name} />
            <Field label="Plant" value={batch.plant_id} mono />
            <Field label="Manufactured" value={batch.manufacturing_date} />
            <Field label="Quantity" value={`${batch.minted_count} / ${batch.quantity}`} />
            <Field label="Category" value={productCategoryLabel(batch.product_category)} />
          </dl>
        </div>

        {/* NFC section note */}
        <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-4 text-sm text-zinc-500">
          {product.status === "TAG_BOUND" ? (
            <div className="flex items-center justify-between">
              <p>
                NFC tag bound.{" "}
                <Link href="/simulator" className="font-medium text-zinc-700 hover:underline">
                  Simulator →
                </Link>{" "}
                to test authentic and replay taps.
              </p>
              {result.tagId && <RevokeButton tagId={result.tagId} />}
            </div>
          ) : (
            <p>
              Awaiting NFC bind. Attach a chip on the{" "}
              <Link href="/manufacturer/nfc" className="font-medium text-zinc-700 hover:underline">
                NFC bind screen →
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Blockchain Events */}
      {result.events.length > 0 && (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 px-6 py-5">
            <h2 className="text-sm font-semibold text-zinc-900">Blockchain Events</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Immutable history anchored on the Hedera Testnet.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">Chain TX</th>
                <th className="px-6 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {result.events.map((event) => (
                <tr key={event.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-3 font-medium text-zinc-900 text-xs">
                    {event.event_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-6 py-3">
                    {event.chain_tx_hash ? (
                      <HashScanLink txHash={event.chain_tx_hash} />
                    ) : (
                      <span className="text-zinc-400 font-mono text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-xs text-zinc-500">
                    {new Date(event.occurred_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-400">{label}</dt>
      <dd className={`mt-0.5 break-all text-zinc-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    TAG_PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    TAG_BOUND: "bg-emerald-50 text-emerald-700 border-emerald-200",
    MINTED: "bg-blue-50 text-blue-700 border-blue-200",
  };
  const cls = map[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200";
  return (
    <span className={`rounded-full border px-3 py-1 text-sm font-medium ${cls}`}>
      {status}
    </span>
  );
}
