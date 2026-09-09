import { productPickerLabel, type BindableProduct } from "@/lib/nfc/product-summary";

export function BoundProductSelect({
  label,
  bound,
  productId,
  onChange,
}: {
  label: string;
  bound: BindableProduct[];
  productId: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="mt-5 block text-sm font-medium text-zinc-700">
      {label}
      <select
        value={productId}
        onChange={(event) => onChange(event.target.value)}
        disabled={bound.length === 0}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
      >
        {bound.length === 0 ? (
          <option value="">Bind a tag first</option>
        ) : (
          bound.map((product) => (
            <option key={product.id} value={product.id}>
              {productPickerLabel(product)}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
