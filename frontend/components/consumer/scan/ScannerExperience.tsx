"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Nfc } from "lucide-react";
import { ScannerFrame } from "@/components/consumer/scan/ScannerFrame";
import { DemoIdPicker } from "@/components/consumer/scan/DemoIdPicker";
import { VerificationStepsList } from "@/components/consumer/scan/VerificationStepsList";
import { VerificationOutcomeCard } from "@/components/consumer/scan/VerificationOutcomeCard";
import { ErrorState } from "@/components/consumer/states/ErrorState";
import { useProductScanner } from "@/lib/consumer/hooks/use-product-scanner";
import { isWebNfcSupported, readTapPayloadFromNfc } from "@/lib/consumer/nfc/web-nfc-support";
import type { NfcTapPayload } from "@/lib/types";

export function ScannerExperience({
  initialTapPayload = null,
}: {
  initialTapPayload?: NfcTapPayload | null;
}) {
  const { state, product, run, error, startDemoScan, startTapScan, reset } =
    useProductScanner(initialTapPayload);
  const reduceMotion = useReducedMotion();
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcListening, setNfcListening] = useState(false);

  useEffect(() => {
    setNfcSupported(isWebNfcSupported());
  }, []);

  const busy = state === "reading" || state === "identified" || state === "verifying";

  async function handleTapToScan() {
    setNfcListening(true);
    try {
      const payload = await readTapPayloadFromNfc();
      if (payload) {
        await startTapScan(payload);
      }
    } finally {
      setNfcListening(false);
    }
  }

  if (state === "error") {
    return (
      <div className="mx-auto w-full max-w-sm">
        <ErrorState description={error ?? "Something went wrong."} onRetry={reset} />
      </div>
    );
  }

  if (state === "result" && run) {
    return (
      <div className="flex flex-col items-center gap-6">
        <VerificationStepsList steps={run.steps} />

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.4 }}
        >
          <VerificationOutcomeCard run={run} product={product} onScanAnother={reset} />
        </motion.div>
      </div>
    );
  }

  if (busy) {
    return (
      <div className="flex flex-col items-center gap-6">
        <ScannerFrame state={state} />

        {product ? (
          <p className="text-sm text-[var(--foreground)]">{product.name}</p>
        ) : null}

        <button
          type="button"
          onClick={reset}
          className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <ScannerFrame state="idle" />

      {nfcSupported ? (
        <button
          type="button"
          onClick={handleTapToScan}
          disabled={nfcListening}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--vc-accent)] px-5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-8px_var(--vc-accent-glow)] disabled:translate-y-0 disabled:opacity-60 motion-reduce:hover:translate-y-0"
        >
          <Nfc size={16} strokeWidth={2} />
          {nfcListening ? "Waiting for tap…" : "Tap to scan with NFC"}
        </button>
      ) : (
        <p className="max-w-xs text-center text-xs leading-5 text-[var(--muted)]">
          NFC scanning isn&apos;t available in this browser. Enter a product ID below to
          verify it instead.
        </p>
      )}

      <div className="flex w-full flex-col items-center gap-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          Or try a demo product
        </p>
        <DemoIdPicker disabled={busy} onSubmit={(id) => void startDemoScan(id)} />
        {error ? (
          <p role="alert" className="text-xs text-[var(--vc-danger)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
