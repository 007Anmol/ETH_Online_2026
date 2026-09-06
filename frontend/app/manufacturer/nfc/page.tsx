import { BindForm } from "./bind-form";
import { SHARED_DEMO_BATCH_CODE } from "@/lib/constants";
import { listProductsForBind } from "@/lib/nfc/list-products";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NfcBindPage() {
  const session = await getSession();
  const products = await listProductsForBind({
    manufacturerOrgId: session?.organizationId,
  });
  const shared = products.filter((product) => product.is_shared_demo);
  const unboundShared = shared.filter((product) => !product.bound_tag_uid).length;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <p className="text-xs font-medium uppercase tracking-widest text-teal-800">
        Phase 1 · NFC bind
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
        Bind NFC tag
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
        Bind one unit from Harsheel&apos;s batch{" "}
        <span className="font-mono">{SHARED_DEMO_BATCH_CODE}</span>. That
        product is the shared demo identity: bind → authentic tap → replay.
      </p>
      <p className="mt-3 max-w-2xl rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-950">
        {shared.length} products in the shared batch. {unboundShared} still
        waiting for a chip. Do not bind extra units unless the demo needs them.
      </p>
      <BindForm products={products} />
    </section>
  );
}
