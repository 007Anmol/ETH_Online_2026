"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, TriangleAlert } from "lucide-react";
import { HederaSessionGate } from "@/components/consumer/HederaSessionGate";

const CATEGORIES = [
  { value: "COUNTERFEIT_SUSPICION", label: "Suspected counterfeit" },
  { value: "DAMAGED_PRODUCT", label: "Damaged product" },
  { value: "MISSING_HISTORY", label: "Missing history / provenance" },
  { value: "OWNERSHIP_DISPUTE", label: "Ownership dispute" },
  { value: "OTHER", label: "Other issue" },
] as const;

export function ReportIssueForm({ productId, productCode }: { productId: string; productCode: string }) {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<"form" | "submitting" | "success" | "failed">("form");
  const [error, setError] = useState<string | null>(null);
  const [grievanceNumber, setGrievanceNumber] = useState<string | null>(null);
  const [grievanceId, setGrievanceId] = useState<string | null>(null);

  const valid = category !== "" && description.trim().length >= 10;

  async function submit() {
    if (!valid) return;
    setStage("submitting");
    setError(null);
    const res = await fetch("/api/consumer/grievances", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, category, description: description.trim() }),
    });
    const body = await res.json();
    if (!res.ok) {
      setStage("failed");
      setError(body.error ?? "Could not submit grievance");
      return;
    }
    setGrievanceNumber(body.grievance.grievance_number);
    setGrievanceId(body.grievance.id);
    setStage("success");
  }

  if (stage === "success" && grievanceId) {
    return (
      <div className="vc-card vc-neon-panel flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
          <Check size={24} className="text-white" strokeWidth={3} />
        </span>
        <div>
          <p className="text-sm font-medium">Grievance submitted</p>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">{grievanceNumber}</p>
        </div>
        <Link
          href={`/consumer/hedera-grievances/${grievanceId}`}
          className="flex h-11 items-center justify-center rounded-full bg-[var(--vc-accent)] px-5 text-sm font-medium text-white"
        >
          Track this grievance
        </Link>
      </div>
    );
  }

  return (
    <div className="vc-card vc-neon-panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        Report an issue
      </p>
      <h1 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{productCode}</h1>

      <HederaSessionGate>
        {() => (
          <>
            <label className="mt-5 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              Category
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={stage === "submitting"}
              className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--vc-accent)]"
            >
              <option value="" disabled>
                Select a category
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={stage === "submitting"}
              rows={5}
              placeholder="Tell us what you noticed, and when."
              className="mt-2 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none focus:border-[var(--vc-accent)]"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              {description.trim().length}/10 characters minimum
            </p>

            <button
              type="button"
              disabled={!valid || stage === "submitting"}
              onClick={() => void submit()}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[var(--vc-accent)] text-sm font-medium text-white disabled:opacity-50"
            >
              {stage === "submitting" ? "Submitting…" : "Submit grievance"}
            </button>

            {stage === "failed" ? (
              <div className="mt-4 flex items-start gap-2 text-sm text-red-600">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}
          </>
        )}
      </HederaSessionGate>
    </div>
  );
}
