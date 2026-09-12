"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Sparkle = { id: number; x: number; y: number; size: number; delay: number; duration: number; color: string };

const COLORS = ["var(--vc-accent)", "var(--vc-neon-cyan)", "var(--vc-neon-pink)"];

function makeSparkles(count: number): Sparkle[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1.5 + Math.random() * 2.5,
    delay: Math.random() * 4,
    duration: 2.5 + Math.random() * 2.5,
    color: COLORS[id % COLORS.length]!,
  }));
}

/**
 * Cheap CSS/framer-motion "sparkles" field (Aceternity-style twinkling dots)
 * over the dark-purple marketplace background — same 2D-only budget as
 * BackgroundAmbient (no WebGL/Three.js; that's reserved for Home's hero and
 * the scan frame), just with per-dot animation instead of a static texture.
 * Purely decorative (aria-hidden) and fully still under reduced motion.
 */
export function MarketplaceSparkles({ count = 36 }: { count?: number }) {
  const reduceMotion = useReducedMotion();
  const sparkles = useMemo(() => makeSparkles(count), [count]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, var(--vc-accent-soft) 0%, transparent 60%)",
        }}
      />
      {sparkles.map((s) =>
        reduceMotion ? (
          <span
            key={s.id}
            className="absolute rounded-full"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              background: s.color,
              opacity: 0.35,
            }}
          />
        ) : (
          <motion.span
            key={s.id}
            className="absolute rounded-full"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, background: s.color }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.4, 0.6] }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ),
      )}
    </div>
  );
}
