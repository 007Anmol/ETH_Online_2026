import { Factory, FlaskConical, Truck, Store, Boxes, User, CircleAlert } from "lucide-react";
import { formatDisplayWhen } from "@/lib/format";
import type { JourneyEvent, ProductJourney } from "@/lib/consumer/types";

const STAGE_ICON: Record<JourneyEvent["stage"], typeof Factory> = {
  MANUFACTURER: Factory,
  MANUFACTURING: Factory,
  QUALITY_CHECK: FlaskConical,
  DISTRIBUTOR: Boxes,
  LOGISTICS: Truck,
  RETAILER: Store,
  CONSUMER: User,
};

const STATUS_STYLES: Record<JourneyEvent["status"], { dot: string; ring: string }> = {
  normal: { dot: "bg-emerald-500", ring: "ring-emerald-500/15" },
  incomplete: { dot: "bg-amber-500", ring: "ring-amber-500/15" },
  anomaly: { dot: "bg-red-500", ring: "ring-red-500/15" },
};

export function JourneyTimeline({ journey }: { journey: ProductJourney }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-6">
      <h3 className="text-sm font-medium">Supply chain journey</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Custody events reconstructed from on-chain records.
      </p>

      <ol className="mt-6 space-y-0">
        {journey.events.map((event, index) => {
          const Icon = STAGE_ICON[event.stage];
          const style = STATUS_STYLES[event.status];
          const isLast = index === journey.events.length - 1;

          return (
            <li key={event.id} className="relative flex gap-4 pb-7 last:pb-0">
              {!isLast ? (
                <span className="absolute left-[15px] top-8 h-[calc(100%-1.75rem)] w-px bg-[var(--border)]" />
              ) : null}

              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ${style.ring} ${style.dot}`}
              >
                <Icon size={15} className="text-white" strokeWidth={2} />
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="text-sm font-medium">
                    {event.stage.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatDisplayWhen(event.timestamp)}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {event.actor} · {event.role} · {event.location}
                </p>
                {event.note ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-amber-600">
                    <CircleAlert size={13} className="mt-0.5 shrink-0" />
                    {event.note}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
