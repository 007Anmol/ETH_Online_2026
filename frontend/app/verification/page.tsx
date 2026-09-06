"use client";

import {
  CheckCircle2,
  Cpu,
  Fingerprint,
  Radio,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";

export default function VerificationPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <Topbar />

          <main className="mx-auto max-w-[1100px] p-6 lg:p-10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
                Agent
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Product Verification
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Analyze NFC data and verify product authenticity before
                releasing settlement.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
              <section className="rounded-xl border border-gray-200 p-8">
                <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border border-gray-200">
                    <Radio size={36} strokeWidth={1.5} />
                  </div>

                  <h2 className="mt-6 text-lg font-semibold">
                    NFC Ready
                  </h2>

                  <p className="mt-2 max-w-sm text-xs leading-5 text-gray-400">
                    Bring the NFC-enabled product close to the verification
                    device to begin authenticity analysis.
                  </p>

                  <button className="mt-6 flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-xs font-medium text-white">
                    <ScanLine size={14} />
                    Scan NFC
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-gray-200">
                <div className="border-b border-gray-200 p-5">
                  <h2 className="text-sm font-semibold">
                    Verification Engine
                  </h2>

                  <p className="mt-1 text-xs text-gray-400">
                    Agent analysis pipeline
                  </p>
                </div>

                <div className="divide-y divide-gray-100">
                  <Check
                    icon={<Fingerprint size={15} />}
                    label="NFC Identity"
                  />

                  <Check
                    icon={<Cpu size={15} />}
                    label="Product Metadata"
                  />

                  <Check
                    icon={<ShieldCheck size={15} />}
                    label="Registry Match"
                  />

                  <Check
                    icon={<CheckCircle2 size={15} />}
                    label="Anomaly Analysis"
                  />
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Check({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3 text-xs text-gray-600">
        {icon}
        {label}
      </div>

      <span className="text-[10px] text-gray-400">READY</span>
    </div>
  );
}