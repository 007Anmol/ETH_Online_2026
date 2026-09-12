import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ProductsList } from "@/components/consumer/products/ProductsList";

export const metadata: Metadata = {
  title: "VeriChain — My products",
};

export default function ConsumerProductsPage() {
  return (
    <Container className="py-10 lg:py-14">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        Consumer verification
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
        My products
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
        Every product you&apos;ve claimed ownership of after a verified scan.
      </p>

      <ProductsList />
    </Container>
  );
}
