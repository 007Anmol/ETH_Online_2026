"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/nav";
import type { Session } from "@/lib/types";

type AppShellProps = {
  session: Session | null;
  children: ReactNode;
};

const BARE_PATHS = new Set(["/", "/login"]);

export function AppShell({ session, children }: AppShellProps) {
  const pathname = usePathname();

  if (BARE_PATHS.has(pathname)) {
    return children;
  }

  return (
    <div className="flex min-h-full flex-col bg-zinc-50">
      <Nav session={session} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
