import { PlaceholderPage } from "@/components/placeholder-page";

export default function ProductsPage() {
  return (
    <PlaceholderPage
      owner="Harsheel"
      title="Products"
      description="Minted digital twins from a batch. Saachi binds an NFC tag to one of these rows."
      nextSteps={[
        "List products from GET /api/products.",
        "Status after mint should be TAG_PENDING until Saachi binds a tag.",
      ]}
    />
  );
}
