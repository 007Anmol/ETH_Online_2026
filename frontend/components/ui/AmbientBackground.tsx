export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="ambient-blob absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full opacity-[0.5] blur-[110px]"
        style={{ background: "var(--accent)" }}
      />
      <div
        className="ambient-blob-alt absolute -right-32 top-1/4 h-[380px] w-[380px] rounded-full opacity-[0.4] blur-[120px]"
        style={{ background: "var(--accent-2)" }}
      />
      <div
        className="ambient-blob absolute -bottom-40 left-1/3 h-[360px] w-[360px] rounded-full opacity-[0.3] blur-[130px]"
        style={{ background: "var(--accent)", animationDelay: "-8s" }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}
