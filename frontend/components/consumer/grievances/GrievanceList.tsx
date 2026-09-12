"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquareWarning } from "lucide-react";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { EmptyState } from "@/components/consumer/states/EmptyState";

type Grievance = {
  id: string;
  grievance_number: string;
  category: string;
  status: string;
  created_at: string;
};

export function GrievanceList() {
  const [grievances, setGrievances] = useState<Grievance[] | null>(null);

  useEffect(() => {
    fetch("/api/consumer/grievances")
      .then((res) => res.json())
      .then((body) => setGrievances(body.grievances ?? []));
  }, []);

  if (grievances === null) {
    return (
      <div className="vc-neon-panel rounded-xl">
        <LoadingState label="Loading grievances" />
      </div>
    );
  }
  if (grievances.length === 0) {
    return (
      <div className="vc-neon-panel rounded-xl">
        <EmptyState
          icon={MessageSquareWarning}
          title="No grievances filed"
          description="Report an issue from a product's page to see it here."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {grievances.map((g) => (
        <Link
          key={g.id}
          href={`/consumer/hedera-grievances/${g.id}`}
          className="vc-card vc-neon-panel flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <div>
            <p className="font-mono text-xs text-[var(--muted)]">{g.grievance_number}</p>
            <p className="mt-1 text-sm font-medium">{g.category}</p>
          </div>
          <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium">
            {g.status}
          </span>
        </Link>
      ))}
    </div>
  );
}
