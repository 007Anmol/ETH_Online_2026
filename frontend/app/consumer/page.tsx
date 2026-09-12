import Link from "next/link";
import { ArrowRight, PackageCheck, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { listMockOwnedProducts } from "@/lib/consumer/mock/mock-data";
import { HomeHero } from "@/components/consumer/HomeHero";

export default function ConsumerHomePage() {
  const ownedProducts = listMockOwnedProducts();

  return (
    <Container>
      <section className="grid gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
        <HomeHero>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
            <Sparkles size={12} style={{ color: "var(--accent)" }} />
            Consumer verification
          </p>
          <h1 className="mt-5 max-w-2xl text-5xl font-medium leading-[0.95] tracking-[-0.06em] sm:text-6xl">
            Know what
            <br />
            you&apos;re <span className="gradient-text">holding.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">
            Scan a product to verify its identity, follow its journey, and see
            the blockchain proof behind it.
          </p>
          <Link
            href="/consumer/scan"
            className="btn-accent mt-8 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-medium"
          >
            <ScanLine size={17} aria-hidden="true" />
            Scan a product
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </HomeHero>

        <HomeHero delay={0.15} className="card-hover border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Your collection
              </p>
              <p className="gradient-text mt-3 text-4xl font-semibold tracking-[-0.05em]">
                {ownedProducts.length}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                verified product{ownedProducts.length === 1 ? "" : "s"}
              </p>
            </div>
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              <PackageCheck size={19} aria-hidden="true" />
            </div>
          </div>

          <div className="mt-8 border-t border-[var(--border)] pt-6">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-emerald-600" aria-hidden="true" />
              <p className="text-sm font-medium">On-chain records, made readable</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Every result explains what was checked and where the proof came
              from.
            </p>
          </div>
        </HomeHero>
      </section>
    </Container>
  );
}
