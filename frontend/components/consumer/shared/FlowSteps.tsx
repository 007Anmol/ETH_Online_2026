export function FlowSteps({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-colors ${
                  done
                    ? "text-white"
                    : active
                      ? "border border-[var(--accent)] text-[var(--accent)]"
                      : "border border-[var(--border)] text-[var(--muted)]"
                }`}
                style={
                  done
                    ? { background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }
                    : undefined
                }
              >
                {done ? "✓" : index + 1}
              </span>
              <span
                className={`hidden text-xs font-medium sm:inline ${
                  active || done ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span className="h-px flex-1 bg-[var(--border)]" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
