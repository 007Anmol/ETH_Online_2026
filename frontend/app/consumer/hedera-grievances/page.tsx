import type { Metadata } from "next";
import { GrievanceList } from "@/components/consumer/grievances/GrievanceList";

export const metadata: Metadata = { title: "VeriChain — My grievances" };

export default function GrievancesPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        Consumer grievance
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">My grievances</h1>
      <div className="mt-6">
        <GrievanceList />
      </div>
    </div>
  );
}
