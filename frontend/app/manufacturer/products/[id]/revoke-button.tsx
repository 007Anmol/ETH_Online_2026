"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RevokeButton({ tagId }: { tagId: string }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleRevoke() {
    setLoading(true);
    try {
      const res = await fetch("/api/nfc/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_id: tagId, reason: "Revoked by manufacturer" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke");

      toast.success("Tag successfully revoked on Hedera Testnet!", {
        description: "The blockchain transaction has been confirmed.",
        duration: 5000,
      });
      setShowConfirm(false);
      router.refresh();
    } catch (err: any) {
      toast.error("Revoke failed", {
        description: err.message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="ml-4 flex items-center gap-2">
        <span className="text-xs text-red-600 font-medium">This is immutable!</span>
        <button
          onClick={handleRevoke}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Revoking…
            </span>
          ) : (
            "Yes, Revoke"
          )}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="ml-4 inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
    >
      Revoke Tag
    </button>
  );
}
