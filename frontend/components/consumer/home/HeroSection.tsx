import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RevealGroup } from "@/components/consumer/RevealGroup";
import { HeroPreviewCards } from "@/components/consumer/home/HeroPreviewCards";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-[36rem] w-[36rem] -translate-y-1/4 translate-x-1/4 rounded-full blur-[100px]"
        style={{ background: "var(--vc-accent-glow)", opacity: 0.35 }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 -translate-x-1/4 translate-y-1/4 rounded-full blur-[90px]"
        style={{ background: "var(--vc-accent-soft)" }}
      />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-10">
        <RevealGroup className="text-center lg:text-left">
          <p data-reveal className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            For the products you buy
          </p>

          <h1
            data-reveal
            className="mx-auto mt-6 max-w-2xl text-[clamp(2.5rem,6vw,4rem)] font-medium leading-[0.98] tracking-[-0.05em] lg:mx-0"
          >
            Know what
            <br />
            you&apos;re{" "}
            <span
              className="verifiable-highlight"
              style={{ boxShadow: "0 0 50px 4px var(--vc-accent-glow)" }}
            >
              buying.
            </span>
          </h1>

          <p
            data-reveal
            className="mx-auto mt-6 max-w-md text-base leading-7 text-[var(--muted)] lg:mx-0"
          >
            Scan any VeriChain-registered product to see who made it, where it&apos;s
            been, and the on-chain proof behind it.
          </p>

          <div
            data-reveal
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start"
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

        <HeroPreviewCards />
      </div>
    </section>
  );
}
