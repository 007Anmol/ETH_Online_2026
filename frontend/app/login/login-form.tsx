"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      className="mt-8 w-full max-w-md rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-left relative overflow-hidden group"
    >
      {/* Decorative gradient orb inside the card */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <p className="text-sm text-zinc-300 relative z-10">
        Phase 1 uses a mock wallet and mock World ID. Real signature flow and ZK proofs will be wired in Phase 3.
      </p>
      
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={continueAsManufacturer}
        disabled={pending}
        className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3.5 text-sm font-semibold text-white hover:from-emerald-400 hover:to-teal-500 disabled:opacity-60 shadow-lg shadow-emerald-900/20 relative z-10"
      >
        {pending ? "Authenticating…" : "Continue as manufacturer"}
      </motion.button>
      
      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 text-sm text-red-400 relative z-10"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}
