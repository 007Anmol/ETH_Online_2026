import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ReportIssueForm } from "@/components/consumer/grievances/ReportIssueForm";

export const metadata: Metadata = {
  title: "VeriChain — Report an issue",
};

export default async function ReportIssuePage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  return (
    <Container className="py-10 lg:py-14">
      <Link
        href="/consumer/products"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={14} />
        My products
      </Link>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        Consumer grievance
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
        Report an issue
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
        Tell us what&apos;s wrong with this product so we can look into it.
      </p>

      <ReportIssueForm productId={productId} />
    </Container>
  );
}
