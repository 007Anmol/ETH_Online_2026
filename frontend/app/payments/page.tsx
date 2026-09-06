"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
} from "lucide-react";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import StatusBadge from "@/components/team2/StatusBadge";

export default function PaymentsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <Topbar />

          <main className="mx-auto max-w-[1200px] p-6 lg:p-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
              Settlement Layer
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Payments
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Automated settlement through x402 and the Hedera network.
            </p>

            <div className="mt-8 rounded-xl border border-gray-200 p-8">
              <div className="grid gap-6 md:grid-cols-5 md:items-center">
                <PaymentNode
                  title="Manufacturer"
                  subtitle="Payment funded"
                />

                <Arrow />

                <PaymentNode
                  title="Escrow"
                  subtitle="₹250,000 locked"
                />

                <Arrow />

                <PaymentNode
                  title="Hedera"
                  subtitle="x402 settlement"
                />
              </div>
            </div>

            <section className="mt-8 rounded-xl border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-5">
                <h2 className="text-sm font-semibold">
                  Recent Settlements
                </h2>
              </div>

              <div className="divide-y divide-gray-100">
                <PaymentRow
                  shipment="VC-1023"
                  amount="₹480,000"
                  status="COMPLETED"
                  hash="0x82a9...f312"
                />

                <PaymentRow
                  shipment="VC-1024"
                  amount="₹250,000"
                  status="LOCKED"
                  hash="0x71ac...91aa"
                />

                <PaymentRow
                  shipment="VC-1022"
                  amount="₹720,000"
                  status="LOCKED"
                  hash="0x9912...bc82"
                />
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function PaymentNode({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
        <CircleDollarSign size={19} />
      </div>

      <p className="mt-3 text-xs font-semibold">{title}</p>

      <p className="mt-1 text-[10px] text-gray-400">{subtitle}</p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden justify-center md:flex">
      <ArrowRight size={16} className="text-gray-300" />
    </div>
  );
}

function PaymentRow({
  shipment,
  amount,
  status,
  hash,
}: {
  shipment: string;
  amount: string;
  status: string;
  hash: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-semibold">{shipment}</p>
        <p className="mt-1 text-[10px] text-gray-400">
          Hedera transaction · x402
        </p>
      </div>

      <p className="text-sm font-semibold">{amount}</p>

      <StatusBadge status={status} />

      <button className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-black">
        {hash}
        <ExternalLink size={11} />
      </button>
    </div>
  );
}