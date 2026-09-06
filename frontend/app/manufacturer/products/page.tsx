import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { Product } from "@/lib/types";

export const metadata = { title: "Products — VeriChain" };

async function getProducts(orgId: string, batchId?: string, status?: string): Promise<Product[]> {
  const db = createServiceClient();
  let query = db
    .from("products")
    .select("*")
    .eq("manufacturer_org_id", orgId)
    .order("created_at", { ascending: false });

  if (batchId) query = query.eq("batch_id", batchId);
  if (status) query = query.eq("status", status as any);

  const { data } = await query;
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
          <h1 className="text-xl font-semibold text-zinc-900">Products</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {products.length} product{products.length !== 1 ? "s" : ""}
            {batch_id ? " in this batch" : " total"}
          </p>
        </div>
        <Link
          href="/manufacturer/batches/create"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + New batch
        </Link>
      </div>

      {/* Filter strip */}
      {batch_id && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Showing products for batch only.{" "}
          <Link href="/manufacturer/products" className="font-medium underline">
            Show all
          </Link>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState hasBatch={!!batch_id} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Product code</th>
                <th className="px-4 py-3">Serial number</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-900">
                    {p.product_code}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {p.serial_number}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/manufacturer/products/${p.id}`}
                      className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline"
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
    TAG_PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    TAG_BOUND: "bg-emerald-50 text-emerald-700 border-emerald-200",
    MINTED: "bg-blue-50 text-blue-700 border-blue-200",
  };
  const cls = map[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function EmptyState({ hasBatch }: { hasBatch: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-8 py-16 text-center">
      <p className="text-sm font-medium text-zinc-600">
        {hasBatch ? "No products in this batch" : "No products yet"}
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        Create a batch to mint product digital twins.
      </p>
      <Link
        href="/manufacturer/batches/create"
        className="mt-5 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Create batch
      </Link>
    </div>
  );
}
