import { PlaceholderPage } from "@/components/placeholder-page";

export default async function ProductPage({
  params,
}: PageProps<"/product/[id]">) {
  const { id } = await params;

  return (
    <PlaceholderPage
      owner="Saachi"
      title={`Product ${id}`}
      description="Public product page. Harsheel fills batch identity; Saachi fills tag bind and last verify result."
      nextSteps={[
        "Show product_code, batch_code, status.",
        "Show bound tag UID and latest verification_attempts.",
      ]}
    />
  );
}
