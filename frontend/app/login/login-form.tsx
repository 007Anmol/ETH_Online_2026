"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function continueAsManufacturer() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/mock-login", { method: "POST" });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(body.error ?? "Could not sign in");
      setPending(false);
      return;
    }

    router.push("/manufacturer");
    router.refresh();
  }

  return (
    <div className="mt-8 max-w-md rounded-xl border border-zinc-200 bg-white p-6">
      <p className="text-sm text-zinc-600">
        Phase 1 uses a mock wallet and mock World ID. Harsheel replaces this
        with a real signature flow in Phase 3.
      </p>
      <button
        type="button"
        onClick={continueAsManufacturer}
        disabled={pending}
        className="mt-5 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Continue as manufacturer"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
