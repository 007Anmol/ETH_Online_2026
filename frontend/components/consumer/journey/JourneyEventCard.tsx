"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertTriangle } from "lucide-react";
import { formatDate, formatDateTime, formatOrNotAvailable } from "@/lib/consumer/format";
import type { ProductJourneyEvent } from "@/lib/consumer/types";

const DOT_CLASSNAME: Record<ProductJourneyEvent["state"], string> = {
  NORMAL: "bg-[var(--foreground)]",
  MISSING: "bg-[var(--muted)]",
  ANOMALY: "bg-[var(--vc-danger)]",
};

export function JourneyEventCard({
  event,
  isLast,
}: {
  event: ProductJourneyEvent;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelId = useId();

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${DOT_CLASSNAME[event.state]}`} />
        {!isLast ? <span className="mt-1 w-px flex-1 bg-[var(--border)]" /> : null}
      </div>

      <div className="w-full pb-8">
        <p className="text-sm font-medium text-[var(--foreground)]">{event.label}</p>

        {event.state === "MISSING" ? (
          <p className="mt-1 text-sm text-[var(--muted)]">Information unavailable</p>
        ) : event.state === "ANOMALY" ? (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-[var(--vc-danger)]/30 bg-[var(--vc-danger-soft)] p-3">
            <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-[var(--vc-danger)]" />
            <p className="text-xs leading-5 text-[var(--foreground)]">
              This checkpoint contains information that does not fully match the trusted
              record. Review the blockchain proof for more detail.
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{event.description}</p>
        )}

        <p className="mt-1.5 text-xs text-[var(--muted)]">
          {formatDate(event.occurredAt)}
          {event.location ? ` · ${event.location}` : ""}
        </p>

        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            <ChevronDown size={13} strokeWidth={2} />
          </motion.span>
          {expanded ? "Hide details" : "View details"}
        </button>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              id={panelId}
              initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}
              className="overflow-hidden"
            >
              <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
                    Checkpoint
                  </dt>
                  <dd className="mt-1 text-sm text-[var(--foreground)]">{event.label}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
                    Recorded
                  </dt>
                  <dd className="mt-1 text-sm text-[var(--foreground)]">
                    {formatDateTime(event.occurredAt)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
                    Location
                  </dt>
                  <dd className="mt-1 text-sm text-[var(--foreground)]">
                    {formatOrNotAvailable(event.location)}
                  </dd>
                </div>
              </dl>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
