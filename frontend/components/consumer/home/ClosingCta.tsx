import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RevealGroup } from "@/components/consumer/RevealGroup";

export function ClosingCta() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <RevealGroup className="text-center">
          <p data-reveal className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            Every purchase, verifiable
          </p>

          <h2
            data-reveal
            className="mx-auto mt-6 max-w-xl text-4xl font-medium leading-[1.02] tracking-[-0.05em] lg:text-6xl"
          >
            Know before
            <br />
            you <span className="verifiable-highlight">trust it.</span>
          </h2>

          <p data-reveal className="mx-auto mt-6 max-w-md text-base leading-7 text-[var(--muted)]">
            One scan away from knowing exactly what you&apos;re holding.
          </p>

          <div data-reveal className="mt-10">
            <Button href="/consumer/scan" className="mx-auto gap-2">
              <ScanLine size={16} strokeWidth={2} />
              Scan a product
            </Button>
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}
