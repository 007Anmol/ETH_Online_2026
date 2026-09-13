import { SimulatorPanel } from "./simulator-panel";
import { listProductsForBind } from "@/lib/nfc/list-products";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const products = await listProductsForBind();

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
        NFC simulator
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        Judges have no chip. These buttons use the same simulate and verify
        APIs as a real tap.
      </p>
      <SimulatorPanel products={products} />
    </section>
  );
}
