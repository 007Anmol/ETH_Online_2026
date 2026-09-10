"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Mail } from "lucide-react";
import { ErrorState } from "@/components/consumer/states/ErrorState";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { useConsumerIdentity } from "@/lib/consumer/hooks/use-consumer-identity";
import type { ConsumerLoginMethod } from "@/lib/consumer/types";

const OPTIONS: { method: ConsumerLoginMethod; label: string; icon: typeof Mail }[] = [
  { method: "GOOGLE", label: "Continue with Google", icon: Globe },
  { method: "EMAIL", label: "Continue with email", icon: Mail },
];

export function LoginPanel() {
  const router = useRouter();
  const { identity, status, error, login } = useConsumerIdentity();
  const [pendingMethod, setPendingMethod] = useState<ConsumerLoginMethod | null>(null);

  useEffect(() => {
    if (identity) {
      router.replace("/consumer");
    }
  }, [identity, router]);

  async function handleLogin(method: ConsumerLoginMethod) {
    setPendingMethod(method);
    try {
      await login(method);
    } catch {
      // status/error already reflect the failure via useConsumerIdentity
    }
  }

  if (status === "checking") {
    return <LoadingState label="Checking your sign-in status" />;
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="text-center">
        <h1 className="text-2xl font-medium tracking-[-0.03em]">Sign in to VeriChain</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Sign in to keep your verified products and ownership history with you.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {OPTIONS.map(({ method, label, icon: Icon }) => {
          const isPending = status === "authenticating" && pendingMethod === method;

          return (
            <button
              key={method}
              type="button"
              disabled={status === "authenticating"}
              onClick={() => handleLogin(method)}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--foreground)]" />
              ) : (
                <Icon size={16} strokeWidth={1.75} />
              )}
              {label}
            </button>
          );
        })}
      </div>

      {status === "error" ? (
        <div className="mt-6">
          <ErrorState
            title="Sign-in failed"
            description={error ?? "Something went wrong. Please try again."}
            onRetry={() => pendingMethod && handleLogin(pendingMethod)}
          />
        </div>
      ) : null}

      <p className="mt-8 text-center text-xs leading-5 text-[var(--muted)]">
        Demo sign-in — this creates a mock identity for testing. No real Google
        or email account is used.
      </p>
    </div>
  );
}
