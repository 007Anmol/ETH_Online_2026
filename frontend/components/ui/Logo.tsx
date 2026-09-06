import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--foreground)]">
        <div className="h-2 w-2 rounded-full bg-[var(--foreground)]" />
      </div>

      <span className="text-sm font-semibold tracking-[-0.02em]">
        PRAMAAN
      </span>
    </Link>
  );
}