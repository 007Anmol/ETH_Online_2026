import { PlaceholderPage } from "@/components/placeholder-page";

export default function BatchesPage() {
  return (
    <PlaceholderPage
      owner="Harsheel"
      title="Batches"
      description="List of manufacturing batches. Demo target: RADO-2026-001 with quantity 3."
      nextSteps={[
        "Render rows from GET /api/batches.",
        "Link each batch to its products.",
      ]}
    />
  );
}
