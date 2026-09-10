import type { Metadata } from "next";
import { ScannerExperience } from "@/components/consumer/scan/ScannerExperience";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scan — VeriChain",
  description: "Scan or enter a product ID to verify its identity, manufacturer, and blockchain proof.",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ConsumerScanPage({
  searchParams,
}: PageProps<"/consumer/scan">) {
  const params = await searchParams;
  const tagUid = firstParam(params.tag_uid);
  const nonce = firstParam(params.nonce);
  const cmac = firstParam(params.cmac);

  const initialTapPayload =
    tagUid && nonce && cmac ? { tag_uid: tagUid, nonce, cmac } : null;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-16">
      <div className="mb-10 max-w-sm text-center">
        <h1 className="text-2xl font-medium tracking-[-0.03em]">Scan a product</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Tap an NFC-enabled product, or enter its ID below.
        </p>
      </div>

      <ScannerExperience initialTapPayload={initialTapPayload} />
    </div>
  );
}
