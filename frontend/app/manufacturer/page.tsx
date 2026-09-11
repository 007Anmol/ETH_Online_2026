import Link from "next/link";
import { redirect } from "next/navigation";
import { GraphQueryError } from "@/lib/graphql";
import { getSession } from "@/lib/session";
import { getGraphDashboardCounts } from "@/lib/view";

export const metadata = { title: "Dashboard — VeriChain Manufacturer" };
export const dynamic = "force-dynamic";

export default async function ManufacturerDashboard() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let counts = { batches: 0, products: 0, bound: 0 };
  let graphError: string | null = null;
  try {
    counts = await getGraphDashboardCounts();
  } catch (error) {
    graphError =
      error instanceof GraphQueryError
        ? error.message
        : error instanceof Error
          ? error.message
          : "The Graph is unavailable";
  }

  const pending = Math.max(0, counts.products - counts.bound);
  const batchValue = graphError ? "—" : counts.batches;
  const productValue = graphError ? "—" : counts.products;
  const boundValue = graphError ? "—" : counts.bound;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Welcome, {session.displayName ?? "Manufacturer"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {session.role} ·{" "}
          <span className="font-mono text-xs">{session.walletAddress}</span>
        </p>
      </div>

      {graphError ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Dashboard counts need The Graph. {graphError}
        </p>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Batches"
          value={batchValue}
          href="/manufacturer/batches"
          color="zinc"
        />
        <StatCard
          label="Products minted"
          value={productValue}
          href="/manufacturer/products"
          color="blue"
        />
        <StatCard
          label="Tags bound"
          value={boundValue}
          sub={graphError ? undefined : `${pending} awaiting NFC bind`}
          href="/manufacturer/products?status=TAG_BOUND"
          color="emerald"
        />
      </div>
      {!graphError ? (
        <p className="mb-8 -mt-4 text-xs text-zinc-400">Indexed on The Graph</p>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/manufacturer/batches/create"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + Create batch
          </Link>
          <Link
            href="/manufacturer/batches"
            className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            View all batches
          </Link>
          <Link
            href="/manufacturer/products?status=TAG_PENDING"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
          >
            Pending NFC bind{graphError ? "" : ` (${pending})`}
          </Link>
          <Link
            href="/manufacturer/nfc"
            className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            NFC bind screen →
          </Link>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  href,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  href: string;
  color: "zinc" | "blue" | "emerald";
}) {
  const colors = {
    zinc: "border-zinc-200 bg-white",
    blue: "border-blue-100 bg-blue-50",
    emerald: "border-emerald-100 bg-emerald-50",
  };
  const textColors = {
    zinc: "text-zinc-900",
    blue: "text-blue-700",
    emerald: "text-emerald-700",
  };
  return (
    <Link
      href={href}
      className={`group rounded-xl border ${colors[color]} p-5 shadow-sm transition hover:shadow-md`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-1 text-4xl font-bold ${textColors[color]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </Link>
  );
}
