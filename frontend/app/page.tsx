import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Hero } from "@/components/landing/Hero";
import { ProductIdentity } from "@/components/landing/ProductIdentity";
import { Lifecycle } from "@/components/landing/Lifecycle";
import { TrustSection } from "@/components/landing/TrustSection";
import { Footer } from "@/components/landing/Footer";
import { IntroOverlay } from "@/components/landing/IntroOverlay";

export default function Home() {
  return (
    <main>
      <IntroOverlay />
      <header className="border-b border-[var(--border)]">
        <Container>
          <nav className="flex h-20 items-center justify-between">
            <Logo />

            <div className="hidden items-center gap-8 text-sm text-[var(--muted)] md:flex">
              <a
                href="#how-it-works"
                className="transition-colors hover:text-[var(--foreground)]"
              >
                How it works
              </a>

              <a
                href="#identity"
                className="transition-colors hover:text-[var(--foreground)]"
              >
                Product identity
              </a>

              <a
                href="#"
                className="transition-colors hover:text-[var(--foreground)]"
              >
                Platform
              </a>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              <a
                href="/login"
                className="btn-accent hidden h-9 items-center rounded-full px-4 text-xs font-medium sm:flex"
              >
                Enter platform
              </a>
            </div>
          </nav>
        </Container>
      </header>

      <Hero />

      <ProductIdentity />

      <Lifecycle />

      <TrustSection />

      <section className="border-t border-[var(--border)] py-32 lg:py-44">
        <Container>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
              The next layer of physical trust
            </p>

            <h2 className="mx-auto mt-6 max-w-3xl text-5xl font-medium leading-[0.95] tracking-[-0.06em] lg:text-7xl">
              Make every product
              <br />
              <span className="verifiable-highlight">Verifiable.</span>
            </h2>

            <p className="mx-auto mt-8 max-w-md text-base leading-7 text-[var(--muted)]">
              Connect the physical world to a lifecycle that can be verified,
              understood, and acted upon.
            </p>

            <a
              href="/login"
              className="btn-accent mt-10 inline-flex h-12 items-center rounded-full px-7 text-sm font-medium"
            >
              Enter the platform
            </a>
          </div>
        </Container>
      </section>

      <Footer />
    </main>
  );
}
