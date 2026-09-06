import { PlaceholderPage } from "@/components/placeholder-page";

export default async function ManufacturerProductPage({
  params,
}: PageProps<"/manufacturer/products/[id]">) {
  const { id } = await params;

  return (
    <PlaceholderPage
      owner="Harsheel"
      title={`Manufacturer product ${id}`}
      description="Factory view of one digital twin: batch fields, mint status, chain tx later."
      nextSteps={[
        "Load the product from GET /api/products/:id.",
        "Leave tag bind and verify history to /product/[id] (Saachi).",
      ]}
    />
  );
}
