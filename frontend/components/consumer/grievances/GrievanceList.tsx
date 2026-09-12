"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquareWarning } from "lucide-react";
import { formatDisplayWhen } from "@/lib/format";
import { GRIEVANCE_CATEGORY_LABELS, GRIEVANCE_STATUS_PRESENTATION } from "@/lib/consumer/status";
import { grievanceProvider } from "@/lib/consumer/registry";
import { EmptyState } from "@/components/consumer/states/EmptyState";
import type { Grievance } from "@/lib/consumer/types";

export function GrievanceList() {
  const [grievances, setGrievances] = useState<Grievance[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void grievanceProvider.listGrievances().then((result) => {
      if (!cancelled) setGrievances(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (grievances === null) {
    return (
      <div className="mt-8 space-y-3">
        {[0, 1].map((key) => (
          <div
            key={key}
            className="h-24 animate-pulse border border-[var(--border)] bg-[var(--surface-muted)]"
          />
        ))}
      </div>
    );
  }

  if (grievances.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          icon={MessageSquareWarning}
          title="No grievances filed"
          description="If something's wrong with a product you own, report it from that product's page."
          action={
            <Link
              href="/consumer/products"
              className="btn-accent inline-flex h-10 items-center rounded-full px-5 text-sm font-medium"
            >
              Go to my products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-3">
      {grievances.map((grievance, index) => {
        const presentation = GRIEVANCE_STATUS_PRESENTATION[grievance.status];
        return (
          <motion.div
            key={grievance.grievanceId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
          >
            <Link
              href={`/consumer/grievances/${grievance.grievanceId}`}
              className="card-hover flex items-center justify-between gap-4 border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{grievance.productName}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {GRIEVANCE_CATEGORY_LABELS[grievance.category]} · Filed{" "}
                  {formatDisplayWhen(grievance.createdAt)}
                </p>
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
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
