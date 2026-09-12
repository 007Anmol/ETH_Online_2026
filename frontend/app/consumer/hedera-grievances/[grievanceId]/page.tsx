import type { Metadata } from "next";
import { GrievanceDetail } from "@/components/consumer/grievances/GrievanceDetail";

export const metadata: Metadata = { title: "VeriChain — Grievance detail" };

export default async function GrievanceDetailPage({
  params,
}: {
  params: Promise<{ grievanceId: string }>;
}) {
  const { grievanceId } = await params;
  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <GrievanceDetail grievanceId={grievanceId} />
    </div>
  );
}
