"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { JourneyEventCard } from "@/components/consumer/journey/JourneyEventCard";
import { computeJourneyDotStates } from "@/lib/consumer/journey-progress";
import type { ProductJourneyEvent } from "@/lib/consumer/types";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function JourneyTimeline({ events }: { events: ProductJourneyEvent[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = root.querySelectorAll("[data-journey-item]");

    if (reduceMotion) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }

    const triggers = Array.from(items).map((item) =>
      gsap.fromTo(
        item,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: item,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        },
      ),
    );

    return () => {
      triggers.forEach((tween) => tween.scrollTrigger?.kill());
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
