import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { GrievanceDetail } from "@/components/consumer/grievances/GrievanceDetail";

export const metadata: Metadata = {
  title: "VeriChain — Grievance",
};

export default async function GrievanceDetailPage({
  params,
}: {
  params: Promise<{ grievanceId: string }>;
}) {
  const { grievanceId } = await params;

  return (
    <Container className="py-10 lg:py-14">
      <Link
        href="/consumer/grievances"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={14} />
        My grievances
      </Link>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        Consumer grievance
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
        Grievance detail
      </h1>

      <GrievanceDetail grievanceId={grievanceId} />
    </Container>
  );
}
