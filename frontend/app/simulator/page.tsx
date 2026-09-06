import { PlaceholderPage } from "@/components/placeholder-page";

export default function SimulatorPage() {
  return (
    <PlaceholderPage
      owner="Saachi"
      title="NFC simulator"
      description="Judges have no hardware. These buttons must call the same verify API as a real tap."
      nextSteps={[
        "Simulate authentic tap: generate a new payload, then POST /api/nfc/verify → AUTHENTIC.",
        "Replay same payload: send the last payload again → DUPLICATE.",
        "Invalid tap: bad CMAC or unknown UID → INVALID.",
      ]}
    />
  );
}
