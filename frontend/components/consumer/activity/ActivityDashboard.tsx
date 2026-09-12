"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ExternalLink, Tag, TriangleAlert } from "lucide-react";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { EmptyState } from "@/components/consumer/states/EmptyState";
import { ErrorState } from "@/components/consumer/states/ErrorState";
import { tinybarsToHbarString } from "@/lib/consumer/chain/hbar-units";

type TransferActivity = {
  kind: "TRANSFER";
  id: string;
  productId: string;
  productCode: string;
  fromWallet: string;
  toWallet: string;
  role: "SENDER" | "RECEIVER";
  status: string;
  syncStatus: string;
  chainTxHash: string | null;
  createdAt: string;
};

type ResaleActivity = {
  kind: "RESALE";
  id: string;
  productId: string;
  productCode: string;
  fromWallet: string;
  toWallet: string;
  role: "SELLER" | "BUYER";
  amountTinybar: string;
  status: string;
  syncStatus: string;
  chainTxHash: string | null;
  createdAt: string;
};

type Activity = TransferActivity | ResaleActivity;

const FAILED_STATUSES = new Set(["FAILED", "REVERTED", "SETTLEMENT_BLOCKED"]);

function statusTone(status: string): "success" | "failed" | "pending" {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success";
  if (FAILED_STATUSES.has(status)) return "failed";
  return "pending";
}

export function ActivityDashboard() {
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/consumer/activity")
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.error) setError(body.error);
        else setActivity(body.activity ?? []);
      })
      .catch(() => !cancelled && setError("Could not load activity"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="vc-neon-panel rounded-xl">
        <ErrorState description={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (activity === null) {
    return (
      <div className="vc-neon-panel rounded-xl">
        <LoadingState label="Loading transfer & resale activity" />
      </div>
    );
  }
  if (activity.length === 0) {
    return (
      <div className="vc-neon-panel rounded-xl">
        <EmptyState
          icon={ArrowLeftRight}
          title="No activity yet"
          description="Real transfers and resales your wallet is involved in — as sender, receiver, buyer, or seller — will show up here."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {activity.map((item) => {
        const tone = statusTone(item.status);
        return (
          <div
            key={`${item.kind}-${item.id}`}
            className="vc-card vc-neon-panel rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {item.kind === "TRANSFER" ? (
                  <ArrowLeftRight size={16} className="text-[var(--vc-accent)]" />
                ) : (
                  <Tag size={16} className="text-[var(--vc-accent)]" />
                )}
                <div>
                  <Link
                    href={`/consumer/hedera-transfer/${item.productId}`}
                    className="text-sm font-medium text-[var(--foreground)] hover:underline"
                  >
                    {item.productCode}
                  </Link>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {item.kind === "TRANSFER"
                      ? item.role === "SENDER"
                        ? `You sent to ${item.toWallet.slice(0, 10)}…`
                        : `You received from ${item.fromWallet.slice(0, 10)}…`
                      : item.role === "SELLER"
                        ? `You sold to ${item.toWallet.slice(0, 10)}… for ${tinybarsToHbarString(BigInt(item.amountTinybar))} HBAR`
                        : `You bought from ${item.fromWallet.slice(0, 10)}… for ${tinybarsToHbarString(BigInt(item.amountTinybar))} HBAR`}
                  </p>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  tone === "success"
                    ? "border-[var(--vc-success)]/40 text-[var(--vc-success)]"
                    : tone === "failed"
                      ? "border-[var(--vc-danger)]/40 text-[var(--vc-danger)]"
                      : "border-[var(--vc-accent)]/40 text-[var(--vc-accent)]"
                }`}
              >
                {item.status}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
              <p className="text-[11px] text-[var(--muted)]">
                {new Date(item.createdAt).toLocaleString()}
                {item.syncStatus === "SYNC_FAILED" ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-500">
                    <TriangleAlert size={11} /> sync pending
                  </span>
                ) : null}
              </p>
              {item.chainTxHash ? (
                <a
                  href={`https://hashscan.io/testnet/transaction/${item.chainTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-mono text-[11px] text-[var(--vc-accent)] hover:underline"
                >
                  {item.chainTxHash.slice(0, 10)}…
                  <ExternalLink size={10} />
                </a>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
