import { VerificationOrb } from "@/components/consumer/three/VerificationOrb";

/**
 * A small, ambient 3D accent for page headers — not interactive, not the
 * page's focal point. Masked to fade at the edges so it reads as texture,
 * not a distraction from the content in front of it.
 */
export function PageOrbAccent({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute -z-10 opacity-70 ${className}`}
      style={{
        maskImage: "radial-gradient(circle, black 45%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(circle, black 45%, transparent 75%)",
      }}
    >
      <VerificationOrb className="h-full w-full" interactive={false} />
    </div>
  );
}
