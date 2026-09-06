"use client";

import {
  ArrowUpRight,
  CircleDollarSign,
  Package,
  ScanLine,
  ShieldCheck,
  Truck,
} from "lucide-react";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import StatusBadge from "@/components/team2/StatusBadge";
import ShipmentCard from "@/components/team2/ShipmentCard";
import { activity, shipments } from "@/lib/mockData";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <Topbar />

          <main className="mx-auto max-w-[1500px] p-6 lg:p-10">
            <div className="mb-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                Transaction Network
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Supply Chain Overview
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Track product movement, agent verification, escrow and
                settlement across the network.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Active Shipments"
                value="24"
                icon={<Truck size={16} />}
              />

              <Stat
                label="Awaiting Verification"
                value="07"
                icon={<ScanLine size={16} />}
              />

              <Stat
                label="Escrow Locked"
                value="₹18.4M"
                icon={<ShieldCheck size={16} />}
              />

              <Stat
                label="Settled via Hedera"
                value="₹42.7M"
                icon={<CircleDollarSign size={16} />}
              />
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
              {/* Active shipments */}
              <section>
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Active Transactions
                    </h2>
                    <p className="mt-1 text-xs text-gray-400">
                      Manufacturer to distributor
                    </p>
                  </div>

                  <a
                    href="/shipments"
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-black"
                  >
                    View all
                    <ArrowUpRight size={13} />
                  </a>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {shipments.slice(0, 4).map((shipment) => (
                    <ShipmentCard
                      key={shipment.id}
                      shipment={shipment}
                    />
                  ))}
                </div>
              </section>

              {/* Activity */}
              <section className="rounded-xl border border-gray-200">
                <div className="border-b border-gray-200 px-5 py-4">
                  <h2 className="text-sm font-semibold">
                    Network Activity
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Latest protocol events
                  </p>
                </div>

                <div className="divide-y divide-gray-100">
                  {activity.map((item) => (
                    <div key={`${item.title}-${item.shipment}`} className="px-5 py-4">
                      <div className="flex justify-between gap-4">
                        <div>
                          <p className="text-xs font-medium">
                            {item.title}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            {item.shipment}
                          </p>
                        </div>

                        <span className="whitespace-nowrap text-[10px] text-gray-400">
                          {item.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        <span className="text-gray-400">{icon}</span>
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}