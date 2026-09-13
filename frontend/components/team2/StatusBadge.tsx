"use client";

import { Badge } from "@/components/ui/Badge";

type Props = {
  status: string;
};

export default function StatusBadge({ status }: Props) {
  return (
    <Badge className={status === "VERIFIED" || status === "DELIVERED" || status === "COMPLETED" ? "bg-[var(--foreground)] text-[var(--background)]" : ""}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}