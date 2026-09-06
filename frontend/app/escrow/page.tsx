"use client";

import { ArrowDown, ArrowUp, LockKeyhole, ShieldCheck } from "lucide-react";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import StatusBadge from "@/components/team2/StatusBadge";

export default function EscrowPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <Topbar />

          <main className="mx-auto max-w-[1200px] p-6 lg:p-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
              Settlement
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Escrow
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Funds remain secured until shipment verification and delivery
              conditions are satisfied.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Metric label="Total Locked" value="₹18.4M" />
              <Metric label="Active Escrows" value="24" />
              <Metric label="Released" value="₹42.7M" />
            </div>

            <section className="mt-8 rounded-xl border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-5">
                <h2 className="text-sm font-semibold">VC-1024</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Pharmaceutical Batch
                </p>
              </div>

              <div className="grid gap-8 p-6 md:grid-cols-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">
                    Escrow Amount
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    ₹250,000
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">
                    Status
                  </p>

                  <div className="mt-3">
                    <StatusBadge status="FUNDED" />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">
                    Release Condition
                  </p>

                  <p className="mt-2 text-xs text-gray-600">
                    Verified delivery + successful agent validation
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 p-6">
                <div className="flex items-center justify-center gap-3">
                  <FlowItem
                    icon={<ArrowUp size={14} />}
                    label="Funded"
                  />

                  <div className="h-px w-16 bg-gray-200" />

                  <FlowItem
                    icon={<LockKeyhole size={14} />}
                    label="Locked"
                  />

                  <div className="h-px w-16 bg-gray-200" />

                  <FlowItem
                    icon={<ShieldCheck size={14} />}
                    label="Verified"
                  />

                  <div className="h-px w-16 bg-gray-200" />

                  <FlowItem
                    icon={<ArrowDown size={14} />}
                    label="Released"
                  />
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function FlowItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200">
        {icon}
      </div>

      <span className="text-[9px] uppercase tracking-wider text-gray-400">
        {label}
      </span>
    </div>
  );
}