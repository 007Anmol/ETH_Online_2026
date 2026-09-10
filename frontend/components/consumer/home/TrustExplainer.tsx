import { Fingerprint, Factory, Route, ShieldCheck } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Fingerprint,
    title: "Product identity",
    description: "Every product carries a unique digital twin that can't be copied or faked.",
  },
  {
    number: "02",
    icon: Factory,
    title: "Manufacturer",
    description: "We confirm the product actually came from the manufacturer it claims to.",
  },
  {
    number: "03",
    icon: Route,
    title: "Supply chain",
    description: "We check every handoff — factory, distributor, retailer — for gaps or anomalies.",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Blockchain proof",
    description: "The full record is anchored on-chain, so it can't be quietly changed later.",
  },
];

export function TrustExplainer() {
  return (
    <section id="how-it-works" className="border-b border-[var(--border)] py-20 lg:py-28">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            What we check
          </p>
          <h2 className="mt-4 text-3xl font-medium leading-[1.05] tracking-[-0.04em] lg:text-4xl">
            Four checks, one answer.
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 border-t border-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="flex flex-col gap-4 border-b border-r border-[var(--border)] p-8 last:border-r-0 sm:[&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r lg:[&:nth-child(4)]:border-r-0"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--muted)]">{step.number}</span>
                <step.icon size={18} strokeWidth={1.5} className="text-[var(--muted)]" />
              </div>

              <div>
                <h3 className="text-sm font-medium text-[var(--foreground)]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
