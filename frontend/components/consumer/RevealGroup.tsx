"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, stagger } from "framer-motion";

/**
 * Wraps a block of heading/copy and staggers a fade-up entrance for every
 * direct-or-nested element marked `data-reveal`. Uses Framer Motion's
 * standalone `animate`/`stagger` DOM utilities — the same engine already
 * used everywhere else in this app — rather than a second animation
 * library. Falls back to an instant, fully-visible state under
 * `prefers-reduced-motion`.
 */
export function RevealGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = root.querySelectorAll("[data-reveal]");

    if (reduceMotion) {
      animate(targets, { opacity: 1, y: 0 }, { duration: 0 });
      return;
    }

    const controls = animate(
      targets,
      { opacity: [0, 1], y: [14, 0] },
      { duration: 0.5, ease: "easeOut", delay: stagger(0.08) },
    );

    return () => {
      controls.stop();
    };
  }, []);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
