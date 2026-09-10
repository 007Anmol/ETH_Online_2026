import type { ProgressDotState } from "@/components/consumer/ProgressDot";
import type { ProductJourneyEvent } from "@/lib/consumer/types";

/**
 * Derives each checkpoint's dot state from the actual event data — never
 * hardcoded. The last NORMAL event in the list is "current" (the furthest
 * point we can confirm); every NORMAL event before it is "completed";
 * MISSING/ANOMALY events keep their own distinct treatment regardless of
 * position.
 */
export function computeJourneyDotStates(events: ProductJourneyEvent[]): ProgressDotState[] {
  let lastNormalIndex = -1;
  events.forEach((event, index) => {
    if (event.state === "NORMAL") lastNormalIndex = index;
  });

  return events.map((event, index) => {
    if (event.state === "ANOMALY") return "anomaly";
    if (event.state === "MISSING") return "missing";
    return index === lastNormalIndex ? "current" : "completed";
  });
}
