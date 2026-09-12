"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Globe, Mail, MessageSquareWarning, ShieldCheck, Wallet, LogOut } from "lucide-react";
import { consumerAuthProvider } from "@/lib/consumer/registry";
import type { ConsumerAuthMethod, ConsumerIdentity } from "@/lib/consumer/types";

const LOGIN_OPTIONS: {
  method: ConsumerAuthMethod;
  label: string;
  icon: typeof Globe;
  accent: string;
}[] = [
  { method: "google", label: "Continue with Google", icon: Globe, accent: "#ea4335" },
  { method: "email", label: "Continue with email", icon: Mail, accent: "var(--accent)" },
  { method: "wallet", label: "Continue with wallet", icon: Wallet, accent: "var(--accent-2)" },
];

function truncateAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function ProfilePanel() {
  const [identity, setIdentity] = useState<ConsumerIdentity | null | undefined>(undefined);
  const [pendingMethod, setPendingMethod] = useState<ConsumerAuthMethod | null>(null);

  useEffect(() => {
    let cancelled = false;
    void consumerAuthProvider.getIdentity().then((result) => {
      if (!cancelled) setIdentity(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(method: ConsumerAuthMethod) {
    setPendingMethod(method);
    const result = await consumerAuthProvider.login(method);
    setIdentity(result);
    setPendingMethod(null);
  }

  async function handleLogout() {
    await consumerAuthProvider.logout();
    setIdentity(null);
  }

  if (identity === undefined) {
    return (
      <div className="mt-10 h-52 max-w-md animate-pulse border border-[var(--border)] bg-[var(--surface-muted)]" />
    );
  }

  if (identity === null) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card-hover mt-10 max-w-md border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <p className="text-sm font-medium">Sign in</p>
        <div className="mt-4 flex flex-col gap-2">
          {LOGIN_OPTIONS.map(({ method, label, icon: Icon, accent }) => (
            <motion.button
              key={method}
              type="button"
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => void handleLogin(method)}
              disabled={pendingMethod !== null}
              className="flex h-12 items-center gap-3 rounded-full border border-[var(--border)] px-4 text-sm font-medium transition-colors hover:border-[var(--accent)] disabled:opacity-50"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
              >
                <Icon size={14} />
              </span>
              {pendingMethod === method ? "Signing in…" : label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-hover mt-10 max-w-md border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full p-[2px]"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--surface)] text-lg font-medium">
            {(identity.displayName ?? "?").charAt(0)}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium">{identity.displayName ?? "Shopper"}</p>
            <ShieldCheck size={14} className="text-emerald-500" />
          </div>
          <p className="mt-0.5 font-mono text-xs text-[var(--muted)]">
            {truncateAddress(identity.walletAddress)}
          </p>
        </div>
      </div>

      <dl className="mt-6 space-y-2.5 border-t border-[var(--border)] pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Signed in with</dt>
          <dd className="font-medium capitalize">{identity.authMethod}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Profile ID</dt>
          <dd className="font-mono text-xs">{identity.profileId}</dd>
        </div>
      </dl>

      <Link
        href="/consumer/grievances"
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] text-sm font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <MessageSquareWarning size={16} />
        My grievances
      </Link>

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] text-sm font-medium transition-colors hover:border-red-400 hover:text-red-500"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </motion.div>
  );
}
