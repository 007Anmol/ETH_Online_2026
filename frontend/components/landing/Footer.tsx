import { ArrowUpRight } from "lucide-react";
import { Container } from "../ui/Container";
import { Logo } from "../ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-12">
      <Container>
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <Logo />

            <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--muted)]">
              Physical products, cryptographically verified.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-[var(--muted)]">
            <a href="#how-it-works" className="transition-colors hover:text-[var(--foreground)]">
              How it works
            </a>

            <a href="#identity" className="transition-colors hover:text-[var(--foreground)]">
              Product identity
            </a>

            <a href="/login" className="flex items-center gap-1 transition-colors hover:text-[var(--foreground)]">
              Enter platform
              <ArrowUpRight size={14} />
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-4 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)] sm:flex-row">
          <span>© 2026 PRAMAAN</span>
          <span>Built for verifiable physical commerce.</span>
        </div>
      </Container>
    </footer>
  );
}