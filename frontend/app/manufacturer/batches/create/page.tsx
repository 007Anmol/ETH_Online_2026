import Link from "next/link";
import { CreateBatchForm } from "./create-batch-form";

export const metadata = { title: "Create batch — VeriChain" };

export default function CreateBatchPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/manufacturer" className="hover:text-zinc-700">Dashboard</Link>
        <span>›</span>
        <Link href="/manufacturer/batches" className="hover:text-zinc-700">Batches</Link>
        <span>›</span>
        <span className="text-zinc-900">New batch</span>
      </nav>

      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-7">
          <h1 className="text-xl font-semibold text-zinc-900">Create manufacturing batch</h1>
          <p className="mt-1 text-sm text-zinc-500">
            One batch creates <span className="font-medium text-zinc-700">N product digital twins</span>,
            all with status <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">TAG_PENDING</code> until
            Saachi binds an NFC tag.
          </p>
        </div>
        <CreateBatchForm />
      </div>
    </main>
  );
}
