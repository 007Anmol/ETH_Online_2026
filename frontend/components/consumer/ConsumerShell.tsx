import type { ReactNode } from "react";
import { ConsumerHeader } from "@/components/consumer/ConsumerHeader";
import { MobileBottomNav } from "@/components/consumer/MobileBottomNav";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

export function ConsumerShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
      <AmbientBackground />

      <ConsumerHeader />

      <main className="flex-1 pb-24 md:pb-0">{children}</main>

      <MobileBottomNav />
    </div>
  );
}
