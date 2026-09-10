"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { formatDateTime, formatOrNotAvailable, truncateMiddle } from "@/lib/consumer/format";
import type { BlockchainProof } from "@/lib/consumer/types";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

export function ProofTechnicalDetails({ proof }: { proof: BlockchainProof }) {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelId = useId();

  return (
    <div className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between text-sm font-medium text-[var(--foreground)]"
      >
        Technical details
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <ChevronDown size={16} strokeWidth={2} />
        </motion.span>
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
            <dl className="mt-4 grid grid-cols-1 gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
              <DetailRow
                label="Transaction hash"
                value={proof.transactionHash ? truncateMiddle(proof.transactionHash, 14, 10) : "Not available"}
              />
              <DetailRow
                label="Contract"
                value={proof.contractAddress ? truncateMiddle(proof.contractAddress, 10, 6) : "Not available"}
              />
              <DetailRow label="Block" value={formatOrNotAvailable(proof.blockNumber)} />
              <DetailRow label="Timestamp" value={formatDateTime(proof.timestamp)} />
              <DetailRow label="Layer" value={formatOrNotAvailable(proof.layer)} />
              <DetailRow label="Event" value={formatOrNotAvailable(proof.eventType)} />
            </dl>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
