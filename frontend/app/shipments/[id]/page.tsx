"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Cpu,
  MapPin,
  ScanLine,
  ShieldCheck,
  Truck,
} from "lucide-react";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import StatusBadge from "@/components/team2/StatusBadge";
import Timeline from "@/components/team2/Timeline";
import {
  fetchCheckpoints,
  fetchCustodyTransfers,
  fetchShipments,
  type CheckpointRecord,
  type CustodyRecord,
  type ShipmentRecord,
} from "@/lib/supabase";

type DetailShipment = ShipmentRecord & {
  shipmentId: string;
  manufacturer: string;
  distributor: string;
  product: string;
  origin: string;
  destination: string;
  verification: string;
  escrow: string;
  payment: string;
  value: string;
};

export default function ShipmentDetails({
  params,
}: {
  params: { id: string };
}) {
  const [shipment, setShipment] = useState<DetailShipment | null>(null);
  const [checkpoints, setCheckpoints] = useState<CheckpointRecord[]>([]);
  const [custodyTransfers, setCustodyTransfers] = useState<CustodyRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const records = await fetchShipments();
        const record = records.find(
          (item) => String(item.on_chain_shipment_id ?? item.id) === params.id,
        );

        if (!record) {
          setError(`Shipment ${params.id} was not found in Supabase.`);
          return;
        }

        const [checkpointRows, custodyRows] = await Promise.all([
          fetchCheckpoints(record.product_id),
          fetchCustodyTransfers(record.product_id),
        ]);

        setShipment({
          ...record,
          shipmentId: String(record.on_chain_shipment_id ?? record.id),
          manufacturer: record.sender_org_id ?? "Unknown sender",
          distributor: record.receiver_org_id ?? "Unknown receiver",
          product: `Product #${record.product_id}`,
          origin: "On-chain sender wallet",
          destination: "On-chain receiver wallet",
          verification: checkpointRows.some((row) => row.anomaly_decision === "ANOMALY") ? "FLAGGED" : "VERIFIED",
          escrow: "NOT LINKED",
          payment: "PENDING",
          value: "Demo shipment",
        });
        setCheckpoints(checkpointRows);
        setCustodyTransfers(custodyRows);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load shipment.");
      }
    };

    void load();
  }, [params.id]);

  if (!shipment) {
    return (
      <div className="min-h-screen bg-white p-8 text-black">
        <Link href="/shipments" className="text-sm underline underline-offset-4">Back to shipments</Link>
        <p className="mt-8 text-sm text-gray-500">{error || "Loading shipment..."}</p>
      </div>
    );
  }

  const timeline = [
    {
      title: "Shipment created",
      description: `${shipment.manufacturer} registered the shipment.`,
      time: "06 Sep · 08:20",
      completed: true,
    },
    {
      title: "NFC verified",
      description: "Product identity successfully verified.",
      time: "06 Sep · 08:42",
      completed: true,
    },
    {
      title: "Agent verification",
      description: "AI/agent validation completed successfully.",
      time: "06 Sep · 09:05",
      completed: true,
    },
    {
      title: "Escrow funded",
      description: `${shipment.value} locked in escrow.`,
      time: "06 Sep · 09:12",
      completed: true,
    },
    {
      title: "Distributor delivery",
      description: `Delivery to ${shipment.distributor}.`,
      time: "Expected · 08 Sep",
      completed: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <Topbar />

          <main className="mx-auto max-w-350 p-6 lg:p-10">
            <Link
              href="/shipments"
              className="mb-6 inline-flex items-center gap-2 text-xs text-gray-500 hover:text-black"
            >
              <ArrowLeft size={14} />
              Back to shipments
            </Link>

            {/* Header */}
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
                  Shipment
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  #{shipment.shipmentId}
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                  {shipment.product}
                </p>
              </div>

              <div className="flex gap-2">
                <StatusBadge status={shipment.status} />
                <StatusBadge status={shipment.verification} />
              </div>
            </div>

            {/* Route */}
            <div className="mt-8 rounded-xl border border-gray-200 p-6">
              <div className="grid gap-8 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <Party
                  title="Manufacturer"
                  name={shipment.manufacturer}
                  location={shipment.origin}
                />

                <div className="hidden md:block">
                  <div className="flex items-center gap-2">
                    <div className="h-px w-20 bg-gray-300" />
                    <Truck size={17} className="text-gray-400" />
                    <div className="h-px w-20 bg-gray-300" />
                  </div>

                  <p className="mt-2 text-center text-[9px] uppercase tracking-wider text-gray-400">
                    In transit
                  </p>
                </div>

                <Party
                  title="Distributor"
                  name={shipment.distributor}
                  location={shipment.destination}
                  right
                />
              </div>
            </div>

            {/* Verification / escrow / payment */}
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <InfoCard
                icon={<ScanLine size={16} />}
                title="Agent Verification"
                value={shipment.verification}
                description="NFC + product identity"
              />

              <InfoCard
                icon={<ShieldCheck size={16} />}
                title="Escrow"
                value={shipment.escrow}
                description={`${shipment.value} secured`}
              />

              <InfoCard
                icon={<CircleDollarSign size={16} />}
                title="Payment"
                value={shipment.payment}
                description="Hedera / x402 settlement"
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* Timeline */}
              <section className="rounded-xl border border-gray-200 p-6">
                <div className="mb-6">
                  <h2 className="text-sm font-semibold">
                    Transaction Timeline
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Complete shipment lifecycle
                  </p>
                </div>

                <Timeline items={timeline} />
              </section>

              {/* NFC / Agent */}
              <section className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Agent Verification
                    </h2>

                    <p className="mt-1 text-xs text-gray-400">
                      NFC authenticity analysis
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white">
                    <Cpu size={16} />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <VerificationRow
                    label="NFC detected"
                    value="Verified"
                  />

                  <VerificationRow
                    label="Product identity"
                    value="Matched"
                  />

                  <VerificationRow
                    label="Manufacturer record"
                    value="Matched"
                  />

                  <VerificationRow
                    label="Shipment binding"
                    value="Valid"
                  />

                  <VerificationRow
                    label="Anomaly analysis"
                    value="No anomaly"
                  />
                </div>

                <button className="mt-6 w-full rounded-lg bg-black py-3 text-xs font-medium text-white transition hover:bg-gray-800">
                  Run Verification
                </button>
              </section>
            </div>

            {/* Checkpoints */}
            <section className="mt-6 rounded-xl border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-5">
                <h2 className="text-sm font-semibold">Checkpoints</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Physical custody verification
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {checkpoints.map((checkpoint) => (
                  <div
                    key={checkpoint.id ?? `${checkpoint.product_id}-${checkpoint.recorded_at}`}
                    className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin size={15} className="text-gray-400" />

                      <div>
                        <p className="text-xs font-medium">
                          {checkpoint.checkpoint_type}
                        </p>

                        <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-400">
                          {checkpoint.anomaly_decision ?? "RECORDED"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-gray-400">
                        {new Date(checkpoint.recorded_at).toLocaleString()}
                      </span>

                      <StatusBadge status={checkpoint.anomaly_decision ?? "RECORDED"} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Custody */}
            <section className="mt-6 rounded-xl border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-5">
                <h2 className="text-sm font-semibold">
                  Custody Transfers
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  Chain of custody
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {custodyTransfers.map((transfer) => (
                  <div
                    key={transfer.id ?? `${transfer.from_org_id}-${transfer.to_org_id}`}
                    className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="text-xs font-medium">
                        {transfer.from_org_id ?? "Unknown"}
                        <span className="mx-2 text-gray-300">→</span>
                        {transfer.to_org_id ?? "Unknown"}
                      </p>

                      <p className="mt-1 text-[10px] text-gray-400">
                        {transfer.transferred_at ? new Date(transfer.transferred_at).toLocaleString() : "Recorded"}
                      </p>
                    </div>

                    {transfer.chain_tx_hash && (
                      <div className="flex items-center gap-1.5 text-[10px] font-medium">
                        <CheckCircle2 size={13} />
                        Verified
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function Party({
  title,
  name,
  location,
  right = false,
}: {
  title: string;
  name: string;
  location: string;
  right?: boolean;
}) {
  return (
    <div className={right ? "md:text-right" : ""}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-400">
        {title}
      </p>

      <p className="mt-2 text-sm font-semibold">{name}</p>

      <p className="mt-1 text-xs text-gray-500">{location}</p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">
          {title}
        </span>
      </div>

      <p className="mt-4 text-lg font-semibold">{value}</p>

      <p className="mt-1 text-xs text-gray-400">{description}</p>
    </div>
  );
}

function VerificationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>

      <span className="flex items-center gap-1.5 text-xs font-medium">
        <CheckCircle2 size={13} />
        {value}
      </span>
    </div>
  );
}