import Link from "next/link";
import { notFound } from "next/navigation";
import { VerifyResult } from "@/components/verify-result";
import { formatDisplayDate, formatDisplayWhen } from "@/lib/format";
import { getPublicProduct } from "@/lib/nfc/get-public-product";
import { productCategoryLabel, type ProductStatus, type VerificationResult } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusLabel(status: ProductStatus) {
  if (status === "TAG_BOUND") return "Chip attached";
  if (status === "TAG_PENDING") return "Waiting for chip";
  return status.replaceAll("_", " ");
}

function attemptLabel(result: VerificationResult) {
  if (result === "AUTHENTIC") return "Genuine first tap";
  if (result === "DUPLICATE") return "Duplicate warning";
  if (result === "INVALID") return "Not verified";
  return "Check failed";
}

export default async function ProductPage({
  params,
}: PageProps<"/product/[id]">) {
  const { id } = await params;
  const product = await getPublicProduct(decodeURIComponent(id));
  if (!product) notFound();

  const latest =
    product.attempts.find(
      (attempt) =>
        attempt.result === "AUTHENTIC" || attempt.result === "DUPLICATE",
    ) ?? product.attempts[0];
  const latestView = latest
    ? {
        result: latest.result,
        product_id: product.id,
        product_code: product.product_code,
        batch_code: product.batch_code,
        product_name: product.product_name,
        product_category: product.product_category ?? undefined,
        manufacturing_date: product.manufacturing_date,
        plant_id: product.plant_id,
      }
    : null;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <p className="text-xs font-medium uppercase tracking-widest text-teal-800">
        Phase 1 · Product
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
        {product.product_name}
      </h1>
      <p className="mt-1 font-mono text-sm text-zinc-500">{product.product_code}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          {latestView ? (
            <VerifyResult view={latestView} showProductLink={false} />
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
              No scans yet.{" "}
              <Link href="/scan" className="font-medium text-zinc-900 underline">
                Check this product
              </Link>
              .
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Factory record</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Product</dt>
              <dd className="font-medium text-zinc-900">{product.product_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Product code</dt>
              <dd className="font-mono text-zinc-900">{product.product_code}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Category</dt>
              <dd className="font-medium text-zinc-900">
                {productCategoryLabel(product.product_category)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Batch</dt>
              <dd className="font-medium text-zinc-900">{product.batch_code}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Date</dt>
              <dd className="font-medium text-zinc-900">
                {formatDisplayDate(product.manufacturing_date)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Plant</dt>
              <dd className="font-medium text-zinc-900">{product.plant_id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Serial</dt>
              <dd className="font-mono text-zinc-900">{product.serial_number}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Status</dt>
              <dd className="font-medium text-zinc-900">
                {statusLabel(product.status)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Chip</dt>
              <dd className="font-mono text-zinc-900">
                {product.bound_tag_uid ?? "Not attached"}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-4">
            <Link
              href="/scan"
              className="text-sm font-medium text-zinc-900 underline"
            >
              Scan again
            </Link>
            <Link
              href={`/manufacturer/products/${product.id}`}
              className="text-sm font-medium text-zinc-900 underline"
            >
              Factory view
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Recent scans</h2>
        {product.attempts.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">None yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {product.attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex items-center justify-between gap-4 py-2 text-sm"
              >
                <span
                  className={
                    attempt.result === "DUPLICATE"
                      ? "font-medium text-red-800"
                      : attempt.result === "AUTHENTIC"
                        ? "font-medium text-teal-800"
                        : "text-zinc-700"
                  }
                >
                  {attemptLabel(attempt.result)}
                </span>
                <span className="text-zinc-500">
                  {formatDisplayWhen(attempt.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
