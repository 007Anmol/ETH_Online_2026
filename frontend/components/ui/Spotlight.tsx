"use client";

import { useEffect, useRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Spotlight({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const move = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      element.style.setProperty("--spotlight-x", `${event.clientX - bounds.left}px`);
      element.style.setProperty("--spotlight-y", `${event.clientY - bounds.top}px`);
    };
    element.addEventListener("pointermove", move);
    return () => element.removeEventListener("pointermove", move);
  }, []);

  return <div ref={ref} className={cn("spotlight", className)} {...props} />;
}