"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Box,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";

const stats = [
  {
    label: "Total Shipments",
    value: "128",
    change: "+12.4%",
    icon: Package,
  },
  {
    label: "In Transit",
    value: "24",
    change: "+4.2%",
    icon: Truck,
  },
  {
    label: "Delivered",
    value: "97",
    change: "+8.7%",
    icon: CheckCircle2,
  },
  {
    label: "Active Anomalies",
    value: "07",
    change: "-18.3%",
    icon: AlertTriangle,
  },
];

const shipments = [
  {
    id: "VC-1024",
    product: "Pharmaceutical Batch",
    origin: "Mumbai",
    destination: "Dubai",
    status: "In Transit",
    statusType: "transit",
    updated: "12 min ago",
  },
  {
    id: "VC-1023",
    product: "Electronic Components",
    origin: "Delhi",
    destination: "Singapore",
    status: "Delivered",
    statusType: "delivered",
    updated: "34 min ago",
  },
  {
    id: "VC-1022",
    product: "Industrial Equipment",
    origin: "Pune",
    destination: "Rotterdam",
    status: "Checkpoint",
    statusType: "checkpoint",
    updated: "1 hr ago",
  },
  {
    id: "VC-1021",
    product: "Medical Devices",
    origin: "Bangalore",
    destination: "London",
    status: "Anomaly",
    statusType: "anomaly",
    updated: "2 hrs ago",
  },
];

const statusStyles: Record<string, string> = {
  transit: "bg-gray-100 text-gray-900",
  delivered: "bg-black text-white",
  checkpoint: "bg-gray-200 text-gray-900",
  anomaly: "bg-gray-900 text-white",
};

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* Top Navigation */}
      <header className="border-b border-gray-200">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
              <ShieldCheck size={17} strokeWidth={2} />
            </div>

            <div>
              <h1 className="text-sm font-semibold tracking-tight">
                PRAMAAN
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
                Supply Chain Network
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-black" />
              Anvil Connected
            </div>

            <button className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium transition hover:border-black">
              Connect Wallet
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        {/* Sidebar */}
        <aside className="hidden min-h-[calc(100vh-65px)] w-56 border-r border-gray-200 p-5 lg:block">
          <nav className="space-y-1">
            <NavItem label="Overview" active />
            <NavItem label="Shipments" />
            <NavItem label="Custody" />
            <NavItem label="Checkpoints" />
            <NavItem label="Anomalies" />
            <NavItem label="Escrows" />
          </nav>

          <div className="mt-10 border-t border-gray-200 pt-5">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
              Network
            </p>

            <div className="space-y-1">
              <NavItem label="Contracts" />
              <NavItem label="Activity" />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <section className="min-w-0 flex-1 p-6 lg:p-10">
          {/* Heading */}
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
                Team 02 / Operations
              </p>

              <h2 className="text-3xl font-semibold tracking-tight">
                Supply Chain Overview
              </h2>

              <p className="mt-2 max-w-xl text-sm text-gray-500">
                Monitor shipments, custody transfers, checkpoints, anomalies,
                and escrow activity across the network.
              </p>
            </div>

            <button className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-xs font-medium text-white transition hover:bg-gray-800">
              Create Shipment
              <ArrowUpRight size={14} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      {stat.label}
                    </span>

                    <Icon size={16} className="text-gray-400" />
                  </div>

                  <div className="mt-5 flex items-end justify-between">
                    <span className="text-3xl font-semibold tracking-tight">
                      {stat.value}
                    </span>

                    <span className="text-xs font-medium text-gray-500">
                      {stat.change}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Content Grid */}
          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
            {/* Recent Shipments */}
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold">Recent Shipments</h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Latest activity across the network
                  </p>
                </div>

                <button className="flex items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-black">
                  View all
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Shipment
                      </th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Route
                      </th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Status
                      </th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Updated
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {shipments.map((shipment) => (
                      <tr
                        key={shipment.id}
                        className="border-b border-gray-100 last:border-0 transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-xs font-semibold">
                              {shipment.id}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-400">
                              {shipment.product}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-xs text-gray-700">
                            {shipment.origin}
                            <span className="mx-2 text-gray-300">→</span>
                            {shipment.destination}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${statusStyles[shipment.statusType]}`}
                          >
                            {shipment.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Clock3 size={12} />
                            {shipment.updated}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Network Activity */}
            <div className="rounded-xl border border-gray-200">
              <div className="border-b border-gray-200 px-5 py-4">
                <h3 className="text-sm font-semibold">Network Activity</h3>
                <p className="mt-1 text-xs text-gray-400">
                  Recent blockchain events
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                <ActivityItem
                  icon={<Box size={14} />}
                  title="Shipment registered"
                  description="VC-1024"
                  time="12 min ago"
                />

                <ActivityItem
                  icon={<Activity size={14} />}
                  title="Custody transferred"
                  description="VC-1023"
                  time="34 min ago"
                />

                <ActivityItem
                  icon={<CheckCircle2 size={14} />}
                  title="Checkpoint verified"
                  description="VC-1022"
                  time="1 hr ago"
                />

                <ActivityItem
                  icon={<AlertTriangle size={14} />}
                  title="Anomaly detected"
                  description="VC-1021"
                  time="2 hrs ago"
                />
              </div>

              <div className="border-t border-gray-200 p-4">
                <button className="flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 py-2.5 text-xs font-medium transition hover:border-black">
                  View Activity
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 flex flex-col justify-between gap-2 border-t border-gray-200 pt-5 text-[10px] uppercase tracking-wider text-gray-400 sm:flex-row">
            <span>VeriChain Protocol</span>
            <span>Local Development Network · Anvil</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function NavItem({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`w-full rounded-lg px-3 py-2.5 text-left text-xs font-medium transition ${
        active
          ? "bg-black text-white"
          : "text-gray-500 hover:bg-gray-100 hover:text-black"
      }`}
    >
      {label}
    </button>
  );
}

function ActivityItem({
  icon,
  title,
  description,
  time,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
}) {
  return (
    <div className="flex gap-3 px-5 py-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium">{title}</p>
        <p className="mt-1 text-[11px] text-gray-400">
          {description} · {time}
        </p>
      </div>
    </div>
  );
}

