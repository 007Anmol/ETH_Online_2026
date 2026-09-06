import type { ProductStatus } from "@/lib/types";
import { DEMO_PRODUCT_CODE, SHARED_DEMO_BATCH_CODE } from "@/lib/constants";

/** Shared with client panels. Keep this file free of server-only imports. */
export type BindableProduct = {
  id: string;
  product_code: string;
  serial_number: string;
  status: ProductStatus;
  batch_code: string | null;
  bound_tag_uid: string | null;
  is_practice: boolean;
  is_shared_demo: boolean;
};

export function isPracticeProduct(product: {
  product_code: string;
  batch_code?: string | null;
}) {
  return product.product_code === DEMO_PRODUCT_CODE;
}

export function isSharedDemoProduct(product: {
  product_code: string;
  batch_code?: string | null;
}) {
  return product.batch_code === SHARED_DEMO_BATCH_CODE;
}

export function productPickerLabel(product: BindableProduct) {
  if (product.is_shared_demo) return `${product.product_code} · Shared demo`;
  if (product.is_practice) return `${product.product_code} · Practice`;
  return `${product.product_code}${product.batch_code ? ` · ${product.batch_code}` : ""}`;
}

export function defaultPendingProductId(products: BindableProduct[]) {
  const pending = products.filter((product) => !product.bound_tag_uid);
  return (
    pending.find((product) => product.is_shared_demo)?.id ??
    pending.find((product) => !product.is_practice)?.id ??
    pending[0]?.id ??
    ""
  );
}

export function defaultBoundProductId(products: BindableProduct[]) {
  const bound = products.filter((product) => product.bound_tag_uid);
  return (
    bound.find((product) => product.is_shared_demo)?.id ??
    bound.find((product) => !product.is_practice)?.id ??
    bound[0]?.id ??
    ""
  );
}
