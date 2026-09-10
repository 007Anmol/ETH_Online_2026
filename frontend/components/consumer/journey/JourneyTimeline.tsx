"use client";

import { useEffect, useRef } from "react";
import { animate, inView } from "framer-motion";
import { JourneyEventCard } from "@/components/consumer/journey/JourneyEventCard";
import { computeJourneyDotStates } from "@/lib/consumer/journey-progress";
import type { ProductJourneyEvent } from "@/lib/consumer/types";

export function JourneyTimeline({ events }: { events: ProductJourneyEvent[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-journey-item]"));

    if (reduceMotion) {
      animate(items, { opacity: 1, y: 0 }, { duration: 0 });
      return;
    }

    const stops = items.map((item) => {
      let stop = () => {};
      stop = inView(
        item,
        () => {
          animate(item, { opacity: [0, 1], y: [24, 0] }, { duration: 0.5, ease: "easeOut" });
          stop();
        },
        { margin: "0px 0px -12% 0px" },
      );
      return stop;
    });

    return () => {
      stops.forEach((stop) => stop());
    };
  }, [events]);

  const dotStates = computeJourneyDotStates(events);

  return (
    <div ref={rootRef} className="w-full max-w-lg">
      {events.map((event, index) => (
        <div key={event.id} data-journey-item>
          <JourneyEventCard
            event={event}
            dotState={dotStates[index]}
            lineHighlighted={dotStates[index] === "completed"}
            isLast={index === events.length - 1}
          />
        </div>
      ))}
    </div>
  );
}
