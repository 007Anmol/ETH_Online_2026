import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ProfilePanel } from "@/components/consumer/profile/ProfilePanel";

export const metadata: Metadata = {
  title: "VeriChain — Profile",
};

export default function ConsumerProfilePage() {
  return (
    <Container className="py-10 lg:py-14">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        Consumer verification
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
        Profile
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
        Sign in to claim products after a verified scan and keep them linked
        to your wallet.
      </p>

      <ProfilePanel />
    </Container>
  );
}
