import Link from "next/link";
import { redirect } from "next/navigation";
import { manufacturerBatchesQuery } from "@/lib/manufacturing";
import { getSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import { productCategoryLabel, type Batch } from "@/lib/types";
import { HashScanLink } from "@/components/ui/hashscan-link";

export const metadata = { title: "Batches — VeriChain" };

async function getBatches(orgId: string): Promise<Batch[]> {
  const { data } = await manufacturerBatchesQuery(createServiceClient(), orgId);
  return (data as Batch[]) ?? [];
}

export default async function BatchesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const batches = session.organizationId
    ? await getBatches(session.organizationId)
    : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Batches</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {batches.length} batch{batches.length !== 1 ? "es" : ""} total
          </p>
        </div>
        <Link
          href="/manufacturer/batches/create"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + New batch
        </Link>
      </div>

      {batches.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Batch code</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Plant</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Chain TX</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-900">
                    {b.batch_code}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{b.product_name}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {productCategoryLabel(b.product_category)}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{b.plant_id}</td>
                  <td className="px-4 py-3 text-zinc-700">{b.quantity}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3">
                    {b.chain_tx_hash ? <HashScanLink txHash={b.chain_tx_hash} /> : <span className="text-zinc-400 font-mono text-[10px]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {new Date(b.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/manufacturer/products?batch_id=${b.id}`}
                      className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline"
                    >
                      Products →
                    </Link>
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

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "MINTED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-zinc-100 text-zinc-600 border-zinc-200";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-8 py-16 text-center">
      <p className="text-sm font-medium text-zinc-600">No batches yet</p>
      <p className="mt-1 text-sm text-zinc-400">
        Create your first batch to mint product digital twins.
      </p>
      <Link
        href="/manufacturer/batches/create"
        className="mt-5 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Create first batch
      </Link>
    </div>
  );
}
