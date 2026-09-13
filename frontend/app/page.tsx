"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CircleDollarSign, ScanLine, ShieldCheck, Truck } from "lucide-react";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import ShipmentCard, { type ShipmentCardData } from "@/components/team2/ShipmentCard";
import {
  fetchAnomalies,
  fetchDirectory,
  fetchEscrows,
  fetchShipments,
  type AnomalyRecord,
  type EscrowRecord,
  type ShipmentRecord,
  type OrganizationRecord,
  type ProductRecord,
} from "@/lib/supabase";

type ActivityItem = { title: string; shipment: string; time: string; timestamp: number };

export default function Home() {
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLiveData() {
      setIsLoading(true);
      try {
        const [shipmentsData, escrowsData, anomaliesData, directoryData] = await Promise.allSettled([
          fetchShipments(),
          fetchEscrows(),
          fetchAnomalies(),
          fetchDirectory(),
        ]);
        const failures: string[] = [];
        if (shipmentsData.status === "fulfilled") setShipments(shipmentsData.value);
        else failures.push("shipments");
        if (escrowsData.status === "fulfilled") setEscrows(escrowsData.value);
        else failures.push("escrows");
        if (anomaliesData.status === "fulfilled") setAnomalies(anomaliesData.value);
        else failures.push("anomalies");
        if (directoryData.status === "fulfilled") {
          setOrganizations(directoryData.value.organizations);
          setProducts(directoryData.value.products);
        } else failures.push("directory");
        setError(failures.length > 0 ? `Live ${failures.join(", ")} data unavailable` : "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Live data unavailable");
      } finally {
        setIsLoading(false);
      }
    }

    void loadLiveData();
    const interval = window.setInterval(() => void loadLiveData(), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  const activeShipments = shipments.filter((shipment) => shipment.status === "CREATED" || shipment.status === "IN_TRANSIT");
  const lockedEscrows = escrows.filter((escrow) => escrow.status === "LOCKED");
  const releasedEscrows = escrows.filter((escrow) => escrow.status === "RELEASED");
  const awaitingVerification = anomalies.filter((anomaly) => anomaly.status === "OPEN").length;
  const liveCards = activeShipments.slice(0, 4).map((shipment) => toShipmentCard(shipment, organizations, products));
  const activity = buildActivity(shipments, escrows, anomalies);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"><div className="flex"><Sidebar /><div className="min-w-0 flex-1"><Topbar /><main className="mx-auto max-w-[1500px] p-6 lg:p-10">
      <div className="mb-8"><p className="eyebrow">Transaction Network</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Supply Chain Overview</h1><p className="mt-2 text-sm text-[var(--muted)]">Live product movement, anomaly verification, and programmable escrow settlement.</p></div>
      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}. Retrying automatically.</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Active Shipments" value={isLoading ? "—" : activeShipments.length.toString().padStart(2, "0")} icon={<Truck size={16} />} /><Stat label="Awaiting Verification" value={isLoading ? "—" : awaitingVerification.toString().padStart(2, "0")} icon={<ScanLine size={16} />} /><Stat label="Escrow Locked" value={isLoading ? "—" : formatEscrowTotal(lockedEscrows)} icon={<ShieldCheck size={16} />} /><Stat label="Settled via Hedera" value={isLoading ? "—" : formatEscrowTotal(releasedEscrows)} icon={<CircleDollarSign size={16} />} /></div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]"><section><div className="mb-4 flex items-end justify-between"><div><h2 className="text-sm font-semibold">Active Transactions</h2><p className="mt-1 text-xs text-[var(--muted)]">Latest shipments from the network</p></div><a href="/shipments" className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]">View all<ArrowUpRight size={13} /></a></div><div className="grid gap-4 md:grid-cols-2">{isLoading ? <p className="text-sm text-[var(--muted)]">Loading live shipments...</p> : liveCards.length > 0 ? liveCards.map((shipment) => <ShipmentCard key={shipment.id} shipment={shipment} />) : <p className="text-sm text-[var(--muted)]">No active shipments recorded yet.</p>}</div></section><section className="surface-panel"><div className="border-b border-[var(--border)] p-5"><h2 className="text-sm font-semibold">Recent Activity</h2><p className="mt-1 text-xs text-[var(--muted)]">Latest live network events</p></div><div className="divide-y divide-[var(--border)]">{isLoading ? <p className="p-5 text-xs text-[var(--muted)]">Loading activity...</p> : activity.length > 0 ? activity.map((item) => <div key={`${item.title}-${item.shipment}-${item.timestamp}`} className="px-5 py-4"><div className="flex justify-between gap-4"><div><p className="text-xs font-medium">{item.title}</p><p className="mt-1 text-[11px] text-[var(--muted)]">{item.shipment}</p></div><span className="whitespace-nowrap text-[10px] text-[var(--muted)]">{item.time}</span></div></div>) : <p className="p-5 text-xs text-[var(--muted)]">No activity recorded yet.</p>}</div></section></div>
    </main></div></div></div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="surface-panel p-5"><div className="flex items-center justify-between"><p className="text-xs text-[var(--muted)]">{label}</p><span className="text-[var(--muted)]">{icon}</span></div><p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p></div>;
}

function toShipmentCard(shipment: ShipmentRecord, organizations: OrganizationRecord[], products: ProductRecord[]): ShipmentCardData {
  const product = products.find((item) => item.id === shipment.product_id);
  const organizationName = (id?: string | null) => organizations.find((organization) => organization.id === id || organization.wallet_address.toLowerCase() === id?.toLowerCase())?.name ?? id?.slice(0, 10) ?? "Unknown organization";
  return {
    id: shipment.on_chain_shipment_id?.toString() || shipment.id.slice(0, 8),
    product: product?.batch?.product_name ? `${product.batch.product_name} · ${product.product_code}` : product?.product_code ?? `Product ${shipment.product_id.slice(0, 8)}`,
    manufacturer: organizationName(shipment.sender_org_id),
    distributor: organizationName(shipment.receiver_org_id),
    origin: "Network origin",
    destination: "Network destination",
    status: shipment.status,
    verification: "LIVE",
    escrow: "ON-CHAIN",
  };
}

function buildActivity(shipments: ShipmentRecord[], escrows: EscrowRecord[], anomalies: AnomalyRecord[]): ActivityItem[] {
  const items: ActivityItem[] = [
    ...shipments.map((shipment) => ({ title: `Shipment ${shipment.status.toLowerCase().replace("_", " ")}`, shipment: shipment.on_chain_shipment_id?.toString() || shipment.id.slice(0, 8), time: relativeTime(shipment.updated_at || shipment.created_at), timestamp: dateValue(shipment.updated_at || shipment.created_at) })),
    ...escrows.map((escrow) => ({ title: `Escrow ${escrow.status.toLowerCase()}`, shipment: `Product ${escrow.product_id.slice(0, 8)}`, time: relativeTime(escrow.updated_at || escrow.created_at), timestamp: dateValue(escrow.updated_at || escrow.created_at) })),
    ...anomalies.map((anomaly) => ({ title: `Anomaly ${anomaly.status.toLowerCase()}`, shipment: `Product ${anomaly.product_id.slice(0, 8)}`, time: relativeTime(anomaly.created_at), timestamp: dateValue(anomaly.created_at) })),
  ];
  return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
}

function formatEscrowTotal(records: EscrowRecord[]) {
  const total = records.reduce((sum, escrow) => sum + Number(escrow.amount || 0), 0);
  if (!total) return "0";
  return `${total.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${records[0]?.currency || ""}`.trim();
}

function dateValue(value?: string) { return value ? new Date(value).getTime() : 0; }
function relativeTime(value?: string) {
  const elapsed = Math.max(0, Date.now() - dateValue(value));
  const minutes = Math.floor(elapsed / 60_000);
  if (!value) return "Unknown time";
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)}d ago`;
}