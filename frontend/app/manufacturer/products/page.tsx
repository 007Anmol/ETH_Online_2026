import Link from "next/link";
import { redirect } from "next/navigation";
import { manufacturerProductsQuery } from "@/lib/manufacturing";
import { getSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase";
import type { Product } from "@/lib/types";

export const metadata = { title: "Products — VeriChain" };

async function getProducts(
  orgId: string,
  batchId?: string,
  status?: string,
): Promise<Product[]> {
  const { data } = await manufacturerProductsQuery(
    createServiceClient(),
    orgId,
    { batchId, status },
  );
  return (data as Product[]) ?? [];
}

type Props = {
  searchParams: Promise<{ batch_id?: string; status?: string }>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { batch_id, status } = await searchParams;

  const products = session.organizationId
    ? await getProducts(session.organizationId, batch_id, status)
    : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Products</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {products.length} product{products.length !== 1 ? "s" : ""}
            {batch_id ? " in this batch" : " total"}
          </p>
        </div>
        <Link
          href="/manufacturer/batches/create"
          className="rounded-lg bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] hover:opacity-80"
        >
          + New batch
        </Link>
      </div>

      {/* Filter strip */}
      {batch_id && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/[0.08] px-4 py-2 text-sm text-sky-700 dark:text-sky-300">
          Showing products for batch only.{" "}
          <Link href="/manufacturer/products" className="font-medium underline">
            Show all
          </Link>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState hasBatch={!!batch_id} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                <th className="px-4 py-3">Product code</th>
                <th className="px-4 py-3">Serial number</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--surface-muted)]">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--foreground)]">
                    {p.product_code}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">
                    {p.serial_number}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/manufacturer/products/${p.id}`}
                      className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:underline"
                    >
                      Detail →
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
  const map: Record<string, string> = {
    TAG_PENDING: "border-amber-500/30 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300",
    TAG_BOUND: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300",
    MINTED: "border-sky-500/30 bg-sky-500/[0.08] text-sky-700 dark:text-sky-300",
  };
  const cls = map[status] ?? "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function EmptyState({ hasBatch }: { hasBatch: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-8 py-16 text-center">
      <p className="text-sm font-medium text-[var(--foreground)]">
        {hasBatch ? "No products in this batch" : "No products yet"}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Create a batch to mint product digital twins.
      </p>
      <Link
        href="/manufacturer/batches/create"
        className="mt-5 inline-block rounded-lg bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-[var(--background)] hover:opacity-80"
      >
        Create batch
      </Link>
    </div>
  );
}
