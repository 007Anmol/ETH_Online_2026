import { ScanPanel } from "./scan-panel";
import { listProductsForBind } from "@/lib/nfc/list-products";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  searchParams,
}: PageProps<"/scan">) {
  const products = await listProductsForBind();
  const params = await searchParams;
  const tagUid = firstParam(params.tag_uid);
  const nonce = firstParam(params.nonce);
  const cmac = firstParam(params.cmac);

  const initialPayload =
    tagUid && nonce && cmac
      ? { tag_uid: tagUid, nonce, cmac }
      : null;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Check this product
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
        A genuine first tap shows the product, batch, date, and plant. The
        same tap a second time shows a duplicate warning.
      </p>
      <ScanPanel products={products} initialPayload={initialPayload} />
    </section>
  );
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}
