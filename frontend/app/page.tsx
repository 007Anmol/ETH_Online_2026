"use client";

import { useEffect, useState } from "react";
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
import { activity, shipments as mockShipments } from "@/lib/mockData";
import { fetchShipments, fetchEscrows, type ShipmentRecord } from "@/lib/supabase";

export default function Home() {
  const [dbShipments, setDbShipments] = useState<ShipmentRecord[]>([]);
  const [activeShipmentCount, setActiveShipmentCount] = useState<number>(24);
  const [escrowLockedEth, setEscrowLockedEth] = useState<string>("₹18.4M");

  useEffect(() => {
    async function loadLiveStats() {
      try {
        const [shipmentsData, escrowsData] = await Promise.allSettled([
          fetchShipments(),
          fetchEscrows(),
        ]);

        if (shipmentsData.status === "fulfilled" && shipmentsData.value.length > 0) {
          setDbShipments(shipmentsData.value);
          const active = shipmentsData.value.filter(
            (s) => s.status === "CREATED" || s.status === "IN_TRANSIT"
          ).length;
          setActiveShipmentCount(active || shipmentsData.value.length);
        }

        if (escrowsData.status === "fulfilled" && escrowsData.value.length > 0) {
          const totalWei = escrowsData.value.reduce((acc, e) => {
            return acc + (e.status === "LOCKED" ? BigInt(e.amount || 0) : 0n);
          }, 0n);
          if (totalWei > 0n) {
            const inEth = (Number(totalWei) / 1e18).toFixed(2);
            setEscrowLockedEth(`${inEth} ETH`);
          }
        }
      } catch {
        // Fall back to default demonstration stats
      }
    }

    void loadLiveStats();
  }, []);

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
                Track physical product movement, AI anomaly verification, and programmable escrow settlement.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Active Shipments"
                value={activeShipmentCount.toString().padStart(2, "0")}
                icon={<Truck size={16} />}
              />

              <Stat
                label="Awaiting Verification"
                value="07"
                icon={<ScanLine size={16} />}
              />

              <Stat
                label="Escrow Locked"
                value={escrowLockedEth}
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
                  {mockShipments.slice(0, 4).map((shipment) => (
                    <ShipmentCard
                      key={shipment.id}
                      shipment={shipment}
                    />
                  ))}
                </div>
              </section>

              {/* Activity feed */}
              <section className="rounded-xl border border-gray-200">
                <div className="border-b border-gray-200 p-5">
                  <h2 className="text-sm font-semibold">Recent Activity</h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Network events and settlement logs
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