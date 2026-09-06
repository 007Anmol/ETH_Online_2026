import { PlaceholderPage } from "@/components/placeholder-page";

export default function ManufacturerDashboardPage() {
  return (
    <PlaceholderPage
      owner="Harsheel"
      title="Manufacturer dashboard"
      description="Counts for batches, minted twins, and bound tags will live here after the batch APIs are implemented."
      nextSteps={[
        "Show batch count and product count from GET /api/batches.",
        "Do not hardcode the manufacturer role in this page — trust the session from the backend.",
      ]}
    />
  );
}
