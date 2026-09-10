"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Animated count-up for stat numbers (My Products, Profile). This is GSAP's
 * one job in this codebase — tweening a numeric value smoothly, which
 * Framer Motion's DOM-target `animate()` doesn't do as naturally as GSAP's
 * numeric-proxy-object tweening.
 */
export function StatCounter({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      el.textContent = String(value);
      return;
    }

    const proxy = { count: 0 };
    const tween = gsap.to(proxy, {
      count: value,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => {
        if (el) el.textContent = String(Math.round(proxy.count));
      },
    });

    return () => {
      tween.kill();
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}
