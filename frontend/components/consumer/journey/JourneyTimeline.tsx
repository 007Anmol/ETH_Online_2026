"use client";

import { motion, useReducedMotion } from "framer-motion";
import { JourneyEventCard } from "@/components/consumer/journey/JourneyEventCard";
import type { ProductJourneyEvent } from "@/lib/consumer/types";

export function JourneyTimeline({ events }: { events: ProductJourneyEvent[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="w-full max-w-lg">
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, delay: reduceMotion ? 0 : index * 0.05 }}
        >
          <JourneyEventCard event={event} isLast={index === events.length - 1} />
        </motion.div>
      ))}
    </div>
  );
}
