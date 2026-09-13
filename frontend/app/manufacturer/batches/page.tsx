import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { productCategoryLabel } from "@/lib/types";
import { HashScanLink } from "@/components/ui/hashscan-link";
import { labeledGraphBatches, type LabeledBatch } from "@/lib/view";

export const metadata = { title: "Batches — VeriChain" };

async function getBatches(): Promise<LabeledBatch[]> {
  return labeledGraphBatches(1000);
}

export default async function BatchesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const batches = session.organizationId ? await getBatches() : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Batches</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {batches.length} batch{batches.length !== 1 ? "es" : ""} total
          </p>
        </div>
        <Link
          href="/manufacturer/batches/create"
          className="rounded-lg bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] hover:opacity-80"
        >
          + New batch
        </Link>
      </div>

      {batches.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
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
            <tbody className="divide-y divide-[var(--border)]">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-[var(--surface-muted)]">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--foreground)]">
                    {b.batch_code ?? b.id}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">{b.product_name ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {b.product_category ? productCategoryLabel(b.product_category) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{b.plant_id ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--foreground)]">{b.mintedCount} / {b.quantity}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3">
                    {b.mintedTx ? <HashScanLink txHash={b.mintedTx} /> : <HashScanLink txHash={b.createdTx} />}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">
                    {new Date(b.createdAt * 1000).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={b.db_id ? `/manufacturer/products?batch_id=${b.db_id}` : "/manufacturer/products"}
                      className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:underline"
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
      ? "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300"
      : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-8 py-16 text-center">
      <p className="text-sm font-medium text-[var(--foreground)]">No batches yet</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Create your first batch to mint product digital twins.
      </p>
      <Link
        href="/manufacturer/batches/create"
        className="mt-5 inline-block rounded-lg bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-[var(--background)] hover:opacity-80"
      >
        Create first batch
      </Link>
    </div>
  );
}
