import { SimulatorPanel } from "./simulator-panel";
import { listProductsForBind } from "@/lib/nfc/list-products";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const products = await listProductsForBind();

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        NFC simulator
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
        Judges have no chip. These buttons use the same simulate and verify
        APIs as a real tap.
      </p>
      <SimulatorPanel products={products} />
    </section>
  );
}
