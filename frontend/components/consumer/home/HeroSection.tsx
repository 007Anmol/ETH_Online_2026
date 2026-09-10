import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RevealGroup } from "@/components/consumer/RevealGroup";
import { PageOrbAccent } from "@/components/consumer/three/PageOrbAccent";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] py-20 lg:py-28">
      <PageOrbAccent className="left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2" />

      <RevealGroup className="relative mx-auto w-full max-w-7xl px-6 text-center lg:px-10">
        <p data-reveal className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          For the products you buy
        </p>

        <h1
          data-reveal
          className="mx-auto mt-6 max-w-2xl text-[clamp(2.5rem,6vw,4rem)] font-medium leading-[0.98] tracking-[-0.05em]"
        >
          Know what
          <br />
          you&apos;re <span className="verifiable-highlight">buying.</span>
        </h1>

        <p data-reveal className="mx-auto mt-6 max-w-md text-base leading-7 text-[var(--muted)]">
          Scan any VeriChain-registered product to see who made it, where it&apos;s
          been, and the on-chain proof behind it.
        </p>

        <div
          data-reveal
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button href="/consumer/scan" className="gap-2">
            <ScanLine size={16} strokeWidth={2} />
            Scan Product
          </Button>

          <a
            href="#how-it-works"
            className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--vc-accent)]"
          >
            See how verification works
          </a>
        </div>
      </RevealGroup>
    </section>
  );
}
