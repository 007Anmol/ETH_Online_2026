import { HashScanLink } from "@/components/ui/hashscan-link";
import { graphEventType } from "@/lib/view";
import type { GraphRegistryEvent } from "@/lib/graphql";

type Props = {
  events: GraphRegistryEvent[];
};

const labels = {
  BATCH_CREATED: "Created",
  BATCH_MINTED: "Minted",
  TAG_BOUND: "Tag Bound",
} as const;

export function GraphProductTimeline({ events }: Props) {
  const timeline = events
    .map((event) => ({ ...event, label: labels[graphEventType(event.type) as keyof typeof labels] }))
    .filter((event) => event.label);

  if (timeline.length === 0) return null;

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-5">
        <h2 className="text-sm font-semibold text-zinc-900">Blockchain timeline</h2>
        <p className="mt-1 text-xs text-zinc-500">Indexed on The Graph</p>
      </div>
      <ol className="divide-y divide-zinc-100">
        {timeline.map((event) => (
          <li key={event.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <span className="text-sm font-medium text-zinc-900">{event.label}</span>
            <span className="flex items-center gap-4 text-xs text-zinc-500">
              <HashScanLink txHash={event.txHash} />
              <time dateTime={new Date(Number(event.timestamp) * 1000).toISOString()}>
                {new Date(Number(event.timestamp) * 1000).toLocaleString()}
              </time>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
