"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { ErrorState } from "@/components/consumer/states/ErrorState";

type GrievanceEvent = { id: string; status: string; note: string; created_at: string };
type Grievance = {
  grievance_number: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
  events: GrievanceEvent[];
};

export function GrievanceDetail({ grievanceId }: { grievanceId: string }) {
  const [grievance, setGrievance] = useState<Grievance | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/consumer/grievances/${grievanceId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setGrievance(body?.grievance ?? null));
  }, [grievanceId]);

  if (grievance === undefined) return <LoadingState label="Loading grievance" />;
  if (grievance === null) {
    return <ErrorState title="Grievance not found" description="This grievance doesn't exist or isn't yours." />;
  }

  return (
    <div className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-[var(--muted)]">{grievance.grievance_number}</p>
          <p className="mt-1 text-sm font-medium">{grievance.category}</p>
        </div>
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium">
          {grievance.status}
        </span>
      </div>

      <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm leading-6">{grievance.description}</p>

      <p className="mt-5 text-sm font-medium">Status history</p>
      <ol className="mt-3 space-y-4">
        {grievance.events.map((event) => (
          <li key={event.id} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500">
              <Check size={12} className="text-white" strokeWidth={3} />
            </span>
            <div>
              <p className="text-sm font-medium">{event.status}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{event.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
