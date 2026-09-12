"use client";

import { useEffect, useState } from "react";
import { Check, Paperclip } from "lucide-react";
import { formatDisplayWhen } from "@/lib/format";
import { GRIEVANCE_CATEGORY_LABELS, GRIEVANCE_STATUS_PRESENTATION } from "@/lib/consumer/status";
import { grievanceProvider } from "@/lib/consumer/registry";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { ErrorState } from "@/components/consumer/states/ErrorState";
import type { Grievance } from "@/lib/consumer/types";

export function GrievanceDetail({ grievanceId }: { grievanceId: string }) {
  const [grievance, setGrievance] = useState<Grievance | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void grievanceProvider.getGrievance(grievanceId).then((result) => {
      if (!cancelled) setGrievance(result);
    });
    return () => {
      cancelled = true;
    };
  }, [grievanceId]);

  if (grievance === undefined) {
    return <LoadingState label="Loading grievance" />;
  }

  if (grievance === null) {
    return (
      <ErrorState
        title="Grievance not found"
        description="This grievance ID doesn't match anything we have on record."
      />
    );
  }

  const presentation = GRIEVANCE_STATUS_PRESENTATION[grievance.status];

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <div className="border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{grievance.productName}</p>
            <p className="mt-1 font-mono text-xs text-[var(--muted)]">
              {grievance.grievanceId}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${presentation.badgeClassName}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${presentation.dotClassName}`} />
            {presentation.label}
          </span>
        </div>

        <dl className="mt-5 space-y-2.5 border-t border-[var(--border)] pt-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Category</dt>
            <dd className="text-right font-medium">
              {GRIEVANCE_CATEGORY_LABELS[grievance.category]}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Filed</dt>
            <dd className="text-right font-medium">
              {formatDisplayWhen(grievance.createdAt)}
            </dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            Description
          </p>
          <p className="mt-2 text-sm leading-6">{grievance.description}</p>
        </div>

        {grievance.evidenceFileName ? (
          <div className="mt-4 flex items-center gap-2 border border-[var(--border)] px-3 py-2 text-sm">
            <Paperclip size={14} className="shrink-0 text-[var(--muted)]" />
            <span className="truncate">{grievance.evidenceFileName}</span>
          </div>
        ) : null}
      </div>

      <div className="border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm font-medium">Status history</p>
        <ol className="mt-5 space-y-5">
          {grievance.events.map((event, index) => {
            const eventPresentation = GRIEVANCE_STATUS_PRESENTATION[event.status];
            const isLast = index === grievance.events.length - 1;
            return (
              <li key={event.id} className="relative flex gap-3 pl-1">
                {!isLast ? (
                  <span className="absolute left-[11px] top-6 h-full w-px bg-[var(--border)]" />
                ) : null}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </span>
                <div className="pb-1">
                  <p className="text-sm font-medium">{eventPresentation.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{event.note}</p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    {formatDisplayWhen(event.timestamp)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
