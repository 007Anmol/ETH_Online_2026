/**
 * Cheap, 2D, non-WebGL replacement for the earlier Three.js page accents —
 * a soft accent-tinted gradient blob + dot-grid texture, masked to fade at
 * the edges. Used on pages that don't warrant a real 3D scene (Product,
 * Journey, Proof, Claim, Profile, My Products) so they still read as
 * designed rather than bare, without the GPU cost of a WebGL context per
 * page. Three.js stays reserved for Home's hero and the scan frame.
 */
export function BackgroundAmbient({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -z-10 ${className}`}
      style={{
        background:
          "radial-gradient(circle, var(--vc-accent-soft) 0%, transparent 70%)",
        maskImage: "radial-gradient(circle, black 40%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(circle, black 40%, transparent 75%)",
      }}
    >
      <svg aria-hidden="true" className="h-full w-full text-[var(--border)]">
        <pattern id="ambient-dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#ambient-dots)" opacity={0.6} />
      </svg>
    </div>
  );
}
