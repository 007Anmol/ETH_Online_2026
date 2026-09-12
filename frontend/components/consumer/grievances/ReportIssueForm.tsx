"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, Paperclip, TriangleAlert, X } from "lucide-react";
import { GRIEVANCE_CATEGORY_LABELS } from "@/lib/consumer/status";
import { grievanceProvider } from "@/lib/consumer/registry";
import type { Grievance, GrievanceCategory } from "@/lib/consumer/types";

const CATEGORY_OPTIONS = Object.entries(GRIEVANCE_CATEGORY_LABELS) as [
  GrievanceCategory,
  string,
][];

type Stage = "form" | "submitting" | "success" | "failed";

export function ReportIssueForm({ productId }: { productId: string }) {
  const shouldReduceMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [category, setCategory] = useState<GrievanceCategory | "">("");
  const [description, setDescription] = useState("");
  const [evidenceName, setEvidenceName] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("form");
  const [grievance, setGrievance] = useState<Grievance | null>(null);

  const valid = category !== "" && description.trim().length >= 10;

  async function submit() {
    if (category === "" || description.trim().length < 10) return;
    setStage("submitting");
    try {
      const result = await grievanceProvider.submitGrievance({
        productId,
        category,
        description: description.trim(),
        evidenceFileName: evidenceName,
      });
      setGrievance(result);
      setStage("success");
    } catch {
      setStage("failed");
    }
  }

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
        transition: { duration: 0.25 },
      };

  return (
    <div className="mt-8 max-w-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <AnimatePresence mode="wait">
        {stage === "form" || stage === "submitting" ? (
          <motion.div key="form" {...motionProps}>
            <label className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              Issue category
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as GrievanceCategory)}
              disabled={stage === "submitting"}
              className="mt-2 h-11 w-full rounded-none border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--foreground)]"
            >
              <option value="" disabled>
                Select a category
              </option>
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <label className="mt-5 block text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              Describe the issue
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={stage === "submitting"}
              rows={5}
              placeholder="Tell us what you noticed, and when."
              className="mt-2 w-full resize-none rounded-none border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none focus:border-[var(--foreground)]"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              {description.trim().length}/10 characters minimum
            </p>

            <label className="mt-5 block text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              Evidence (optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => setEvidenceName(event.target.files?.[0]?.name ?? null)}
            />
            {evidenceName ? (
              <div className="mt-2 flex items-center justify-between border border-[var(--border)] px-3 py-2 text-sm">
                <span className="flex items-center gap-2 truncate">
                  <Paperclip size={14} className="shrink-0 text-[var(--muted)]" />
                  <span className="truncate">{evidenceName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceName(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-[var(--muted)] hover:text-[var(--foreground)]"
                  aria-label="Remove attachment"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={stage === "submitting"}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-none border border-dashed border-[var(--border)] text-sm text-[var(--muted)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
              >
                <Paperclip size={14} />
                Attach a photo or file
              </button>
            )}

            <button
              type="button"
              disabled={!valid || stage === "submitting"}
              onClick={() => void submit()}
              className="btn-accent mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-medium disabled:opacity-40"
            >
              {stage === "submitting" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit grievance"
              )}
            </button>
          </motion.div>
        ) : stage === "success" && grievance ? (
          <motion.div
            key="success"
            {...motionProps}
            className="flex flex-col items-center gap-4 py-6 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
              <Check size={24} className="text-white" strokeWidth={3} />
            </span>
            <div>
              <p className="text-sm font-medium">Grievance submitted</p>
              <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                {grievance.grievanceId}
              </p>
              <p className="mt-2 max-w-xs text-sm text-[var(--muted)]">
                We&apos;ll review this and update its status. You can track
                progress from My Grievances.
              </p>
            </div>
            <Link
              href={`/consumer/grievances/${grievance.grievanceId}`}
              className="btn-accent mt-2 flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
            >
              Track this grievance
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="failed"
            {...motionProps}
            className="flex flex-col items-center gap-4 py-6 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500">
              <TriangleAlert size={22} className="text-white" />
            </span>
            <p className="text-sm font-medium">Couldn&apos;t submit grievance</p>
            <button
              type="button"
              onClick={() => setStage("form")}
              className="mt-2 flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium transition-colors hover:border-[var(--foreground)]"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
