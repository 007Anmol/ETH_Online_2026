"use client";

import { Plus, Search } from "lucide-react";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import ShipmentCard from "@/components/team2/ShipmentCard";
import { shipments } from "@/lib/mockData";

export default function ShipmentsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <Topbar />

          <main className="mx-auto max-w-[1400px] p-6 lg:p-10">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
                  Operations
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Shipments
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                  Manage product movement between manufacturers and
                  distributors.
                </p>
              </div>

              <button className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-xs font-medium text-white">
                <Plus size={14} />
                Create Shipment
              </button>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5">
                <Search size={15} className="text-gray-400" />
                <input
                  placeholder="Search shipments..."
                  className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400"
                />
              </div>

              <button className="rounded-lg border border-gray-200 px-4 py-2.5 text-xs text-gray-600">
                All statuses
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shipments.map((shipment) => (
                <ShipmentCard
                  key={shipment.id}
                  shipment={shipment}
                />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}