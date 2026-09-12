"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, RefreshCw } from "lucide-react";
import { formatEther } from "viem";
import { useReadContract } from "wagmi";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import StatusBadge from "@/components/team2/StatusBadge";
import { CONTRACTS } from "@/lib/contracts";
import {
  ESCROW_STATUS,
  PRODUCT_STATUS,
  hashscanAddress,
  hashscanTx,
} from "@/lib/blockchain/explorer";
import {
  findLatestEscrowForProduct,
  findLatestShipmentForProduct,
  type OnChainEscrow,
  type OnChainShipment,
} from "@/lib/blockchain/supplyChainReads";
import { legacySupplyChainAbi } from "@/lib/team2/legacySupplyChainAbi";
import { DEMO_PRODUCT } from "@/lib/demoProduct";

type LogisticsProduct = readonly [`0x${string}`, `0x${string}`, number, boolean];
type EventRow = {
  id?: string;
  event_type?: string;
  payload?: { from?: string; to?: string; leg?: string; token_id?: number };
  chain_tx_hash?: string | null;
  occurred_at?: string;
};

type Lifecycle = {
  product: {
    product_code?: string;
    product_id_hash?: string;
    token_id?: number | null;
    status?: string;
    chain_tx_hash?: string | null;
  } | null;
  events: EventRow[];
  tags: Array<{ tag_uid?: string; status?: string; chain_tx_hash?: string | null }>;
  batch: { batch_code?: string; product_name?: string; plant_id?: string; manufacturer_org_id?: string } | null;
};

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [lookup, setLookup] = useState(params.id ?? DEMO_PRODUCT.logisticsId);
  const [lifecycle, setLifecycle] = useState<Lifecycle | null>(null);
  const [shipment, setShipment] = useState<OnChainShipment | null>(null);
  const [matchedEscrow, setMatchedEscrow] = useState<{ id: bigint; row: OnChainEscrow } | null>(null);
  const [error, setError] = useState("");

  const tokenId = useMemo(() => {
    try {
      return BigInt(params.id || "0");
    } catch {
      return 0n;
    }
  }, [params.id]);

  const { data: logistics, refetch } = useReadContract({
    address: CONTRACTS.supplyChain,
    abi: legacySupplyChainAbi,
    functionName: "products",
    args: [tokenId],
    query: { enabled: tokenId > 0n },
  });
  const product = logistics as LogisticsProduct | undefined;
  const exists = product?.[3] === true;
  const owner = exists ? product[1] : undefined;
  const status = product ? PRODUCT_STATUS[product[2]] ?? "UNKNOWN" : "MISSING";
  const escrowForProduct = matchedEscrow?.row;
  const escrowStatus = escrowForProduct ? ESCROW_STATUS[escrowForProduct[4]] : "NONE";

  const load = async () => {
    setError("");
    try {
      const paramsOut = new URLSearchParams({ details: "1" });
      if (/^\d+$/.test(params.id)) paramsOut.set("tokenId", params.id);
      else paramsOut.set("productCode", params.id);
      const res = await fetch(`/api/products/sync?${paramsOut.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as Lifecycle & { error?: string };
      if (!res.ok) throw new Error(body.error || "Lookup failed");
      setLifecycle(body);
      if (tokenId > 0n) {
        setShipment(await findLatestShipmentForProduct(tokenId));
        setMatchedEscrow(await findLatestEscrowForProduct(tokenId));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load product");
    }
  };

  useEffect(() => {
    setLookup(params.id);
    void load();
    void refetch();
  }, [params.id]);

  const jump = (event: FormEvent) => {
    event.preventDefault();
    if (lookup.trim()) router.push(`/product/${lookup.trim()}`);
  };

  const currentOwnerLabel = owner
    ? latestOwnerRole(lifecycle?.events, owner)
    : "Not registered in logistics";

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="mx-auto max-w-350 p-6 lg:p-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">NFT / product</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Product history</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              Who has it now, every send and receive, plus the NFT identity. Owner only changes after I received it.
            </p>

            <form onSubmit={jump} className="mt-6 flex max-w-xl gap-3">
              <input
                value={lookup}
                onChange={(event) => setLookup(event.target.value)}
                placeholder="token id or product code"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              />
              <button className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium hover:border-black">
                Open
              </button>
              <button
                type="button"
                onClick={() => {
                  void load();
                  void refetch();
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs hover:border-black"
              >
                <RefreshCw size={14} />
              </button>
            </form>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <StatusBadge status={status} />
              <StatusBadge status={escrowStatus === "ACTIVE" ? "LOCKED" : escrowStatus} />
              <Link className="text-xs underline" href="/shipments">Logistics</Link>
              <Link className="text-xs underline" href="/settlement">Sale</Link>
            </div>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-6">
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Identity</p>
                <h2 className="mt-2 text-xl font-semibold">#{params.id}</h2>
                <dl className="mt-6 space-y-3 text-sm">
                  <Row label="Product ID / token ID" value={String(lifecycle?.product?.token_id ?? params.id)} />
                  <Row label="Product code" value={lifecycle?.product?.product_code} />
                  <Row label="Team 1 hash" value={exists ? product[0] : lifecycle?.product?.product_id_hash} />
                  <Row label="Batch" value={lifecycle?.batch?.batch_code} />
                  <Row label="NFC tag" value={lifecycle?.tags?.[0]?.tag_uid} />
                  <Row label="Supabase status" value={lifecycle?.product?.status} />
                </dl>
              </div>

              <div className="rounded-xl border border-gray-200 p-6">
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Current state</p>
                <h2 className="mt-2 text-xl font-semibold">{currentOwnerLabel}</h2>
                <dl className="mt-6 space-y-3 text-sm">
                  <Row label="Current owner / custodian" value={owner} href={owner ? hashscanAddress(owner) : undefined} />
                  <Row label="Shipment status" value={shipment?.[5] ? (product?.[2] === 1 ? "IN TRANSIT" : product?.[2] === 2 ? "DELIVERED / RECEIVED" : status) : "NONE"} />
                  <Row label="Latest shipment" value={shipment?.[5] ? `#${shipment[0].toString()} · ${shipment[2].slice(0, 8)}… → ${shipment[3].slice(0, 8)}…` : "—"} />
                  <Row
                    label="Latest sale"
                    value={
                      escrowForProduct
                        ? `${escrowStatus}${escrowForProduct[3] > 0n ? ` · ${formatEther(escrowForProduct[3])} HBAR` : ""}`
                        : "No sale yet"
                    }
                  />
                  <Row
                    label="Latest chain tx"
                    value={lifecycle?.product?.chain_tx_hash ?? undefined}
                    href={lifecycle?.product?.chain_tx_hash ? hashscanTx(lifecycle.product.chain_tx_hash) : undefined}
                  />
                </dl>
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold">Custody history</h2>
              <p className="mt-1 text-xs text-gray-400">A new row is added when someone clicks I received it.</p>
              <div className="mt-4 divide-y divide-gray-100">
                {(lifecycle?.events ?? []).length === 0 && (
                  <p className="py-4 text-xs text-gray-400">No custody events yet. After manufacturing the owner is the manufacturer.</p>
                )}
                {(lifecycle?.events ?? []).map((event) => (
                  <div key={event.id ?? `${event.occurred_at}-${event.event_type}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-medium">
                        {event.event_type}
                        {event.payload?.leg ? ` · ${event.payload.leg}` : ""}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-gray-500">
                        {event.payload?.from ?? "—"} → {event.payload?.to ?? "—"}
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-gray-400">
                      <p>{event.occurred_at ? new Date(event.occurred_at).toLocaleString() : ""}</p>
                      {event.chain_tx_hash && (
                        <a className="inline-flex items-center gap-1 underline" href={hashscanTx(event.chain_tx_hash)} target="_blank" rel="noreferrer">
                          {event.chain_tx_hash.slice(0, 10)}… <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {error && <p className="mt-4 text-xs text-gray-500">{error}</p>}
          </main>
        </div>
      </div>
    </div>
  );
}

function latestOwnerRole(events: EventRow[] | undefined, owner: string) {
  const last = [...(events ?? [])].reverse().find((event) => event.payload?.to?.toLowerCase() === owner.toLowerCase());
  if (last?.payload?.leg === "sale") return "Current owner (sale)";
  if (last?.payload?.leg === "logistics") return "Current owner (logistics)";
  if (!last) return "Current owner (manufacturer)";
  return "Current owner";
}

function Row({ label, value, href }: { label: string; value?: string; href?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="mt-1 break-all font-mono text-xs">
        {href && value ? (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
            {value} <ExternalLink size={10} />
          </a>
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}
