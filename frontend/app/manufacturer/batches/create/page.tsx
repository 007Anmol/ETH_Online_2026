import { PlaceholderPage } from "@/components/placeholder-page";

export default function CreateBatchPage() {
  return (
    <PlaceholderPage
      owner="Harsheel"
      title="Create batch"
      description="Form fields: product name, batch code, plant ID, manufacturing date, expiry, quantity."
      nextSteps={[
        "POST /api/batches must insert one batch row and N product rows.",
        "Reject duplicate batch_code and quantity <= 0.",
      ]}
    />
  );
}
