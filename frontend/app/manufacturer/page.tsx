import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardCounts } from "@/lib/manufacturing";
import { getSession } from "@/lib/session";

export const metadata = { title: "Dashboard — VeriChain Manufacturer" };

export default async function ManufacturerDashboard() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }
  const counts = session.organizationId
    ? await getDashboardCounts(session.organizationId)
    : { batches: 0, products: 0, bound: 0 };

  const pending = counts.products - counts.bound;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Welcome, {session.displayName ?? "Manufacturer"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Phase 1 dashboard · {session.role} ·{" "}
          <span className="font-mono text-xs">{session.walletAddress}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Batches"
          value={counts.batches}
          href="/manufacturer/batches"
          color="zinc"
        />
        <StatCard
          label="Products minted"
          value={counts.products}
          href="/manufacturer/products"
          color="blue"
        />
        <StatCard
          label="Tags bound"
          value={counts.bound}
          sub={`${pending} awaiting NFC bind`}
          href="/manufacturer/products?status=TAG_BOUND"
          color="emerald"
        />
      </div>

      {/* Quick actions */}
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
            Pending NFC bind ({pending})
          </Link>
          <Link
            href="/manufacturer/nfc"
            className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            NFC bind screen →
          </Link>
        </div>
      </div>

      {/* Phase 1 story note */}
      <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-700">
        <strong>Phase 1 story:</strong> Login → Create batch of 3 → Saachi binds NFC →
        First tap = AUTHENTIC → Replay = DUPLICATE.
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
  value: number;
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
