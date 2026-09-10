import type { ReactNode } from "react";
import { ConsumerHeader } from "@/components/consumer/ConsumerHeader";
import { MobileBottomNav } from "@/components/consumer/MobileBottomNav";
import { PageTransition } from "@/components/consumer/PageTransition";

export function ConsumerShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
      <ConsumerHeader />
      <main className="flex-1 pb-24 md:pb-12">
        <PageTransition>{children}</PageTransition>
      </main>
      <MobileBottomNav />
    </div>
  );
}
