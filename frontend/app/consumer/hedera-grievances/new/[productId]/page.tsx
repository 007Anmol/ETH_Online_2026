import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase";
import { ReportIssueForm } from "@/components/consumer/grievances/ReportIssueForm";
import { ErrorState } from "@/components/consumer/states/ErrorState";

export const metadata: Metadata = { title: "VeriChain — Report an issue" };

export default async function ReportIssuePage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const supabase = createServiceClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, product_code")
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <ErrorState title="Product not found" description="No real product matches this ID." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <ReportIssueForm productId={product.id} productCode={product.product_code} />
    </div>
  );
}
