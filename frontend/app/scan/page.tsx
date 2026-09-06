import { PlaceholderPage } from "@/components/placeholder-page";

export default function ScanPage() {
  return (
    <PlaceholderPage
      owner="Saachi"
      title="Scan / verify"
      description="Consumer-facing tap screen. Reuse POST /api/nfc/verify. Do not decide AUTHENTIC in the browser."
      nextSteps={[
        "Accept a payload (or jump to the simulator in Phase 1).",
        "Show AUTHENTIC PRODUCT with batch, plant, and date from the API.",
      ]}
    />
  );
}
