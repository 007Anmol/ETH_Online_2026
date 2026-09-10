import { Check, Clock, ShieldOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BlockchainProofState } from "@/lib/consumer/types";

const PRESENTATION: Record<
  BlockchainProofState,
  { icon: LucideIcon; heading: string; iconClassName: string; description: string }
> = {
  CONFIRMED: {
    icon: Check,
    heading: "Proof available",
    iconClassName: "bg-[var(--vc-success-soft)] text-[var(--vc-success)]",
    description: "The verification record is anchored to a public blockchain.",
  },
  PENDING: {
    icon: Clock,
    heading: "Proof pending",
    iconClassName: "bg-[var(--vc-warning-soft)] text-[var(--vc-warning)]",
    description: "The verification record has been created, but blockchain confirmation is still pending.",
  },
  UNAVAILABLE: {
    icon: ShieldOff,
    heading: "Blockchain proof unavailable",
    iconClassName: "bg-[var(--surface-muted)] text-[var(--muted)]",
    description: "The product record could not currently be matched to an available on-chain proof.",
  },
};

export function ProofStatusHero({ state }: { state: BlockchainProofState }) {
  const { icon: Icon, heading, iconClassName, description } = PRESENTATION[state];

  return (
    <div className="text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${iconClassName}`}>
        <Icon size={26} strokeWidth={2} />
      </div>
      <h1 className="mt-4 text-xl font-medium tracking-[-0.02em] text-[var(--foreground)]">
        {heading}
      </h1>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}
