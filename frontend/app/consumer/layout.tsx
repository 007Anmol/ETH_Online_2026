import type { ReactNode } from "react";
import { ConsumerShell } from "@/components/consumer/ConsumerShell";
import "./consumer.css";

export default function ConsumerLayout({ children }: { children: ReactNode }) {
  return <ConsumerShell>{children}</ConsumerShell>;
}
