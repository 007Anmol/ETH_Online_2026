import { BindForm } from "./bind-form";
import { listProductsForBind } from "@/lib/nfc/list-products";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NfcBindPage() {
  const session = await getSession();
  const products = await listProductsForBind({
    manufacturerOrgId: session?.organizationId,
  });
  const unbound = products.filter((product) => !product.bound_tag_uid).length;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
        Bind NFC tag
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        Attach one chip to one minted product. A product can only have one
        active tag.
      </p>
      <p className="mt-3 max-w-2xl rounded-lg border border-emerald-500/30 bg-emerald-500/[0.08] px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
        {unbound} product{unbound === 1 ? "" : "s"} waiting for a chip.
      </p>
      <BindForm products={products} />
    </section>
  );
}
