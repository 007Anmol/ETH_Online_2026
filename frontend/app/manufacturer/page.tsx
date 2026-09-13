import { redirect } from "next/navigation";
import { GraphQueryError } from "@/lib/graphql";
import { getSession } from "@/lib/session";
import { getGraphDashboardCounts } from "@/lib/view";
import { ManufacturerDashboardView } from "@/app/manufacturer/manufacturer-dashboard-view";

export const metadata = { title: "Dashboard — VeriChain Manufacturer" };
export const dynamic = "force-dynamic";

export default async function ManufacturerDashboard() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let counts = { batches: 0, products: 0, bound: 0 };
  let graphError: string | null = null;
  try {
    counts = await getGraphDashboardCounts();
  } catch (error) {
    graphError =
      error instanceof GraphQueryError
        ? error.message
        : error instanceof Error
          ? error.message
          : "The Graph is unavailable";
  }

  const pending = Math.max(0, counts.products - counts.bound);
  const batchValue = graphError ? "—" : counts.batches;
  const productValue = graphError ? "—" : counts.products;
  const boundValue = graphError ? "—" : counts.bound;

  return (
    <ManufacturerDashboardView
      graphError={graphError}
      batchValue={batchValue}
      productValue={productValue}
      boundValue={boundValue}
      pending={pending}
    />
  );
}
