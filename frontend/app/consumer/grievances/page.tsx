import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { GrievanceList } from "@/components/consumer/grievances/GrievanceList";

export const metadata: Metadata = {
  title: "VeriChain — My grievances",
};

export default function GrievancesPage() {
  return (
    <Container className="py-10 lg:py-14">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        Consumer grievance
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
        My grievances
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
        Track the status of issues you&apos;ve reported on your products.
      </p>

      <GrievanceList />
    </Container>
  );
}
