"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Plus, RefreshCw, Search, Truck } from "lucide-react";
import { isAddress } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import StatusBadge from "@/components/team2/StatusBadge";
import { CONTRACTS } from "@/lib/contracts";
import { registryAbi } from "@/lib/registryAbi";
import {
  createShipmentRecord,
  fetchShipments,
  updateShipmentRecord,
  type ShipmentRecord as DbShipmentRecord,
} from "@/lib/supabase";

const shipmentStatuses = ["CREATED", "IN_TRANSIT", "RECEIVED", "CANCELLED"] as const;

type ContractShipmentRecord = readonly [
  bigint,
  bigint,
  `0x${string}`,
  `0x${string}`,
  number,
  boolean,
];

export default function ShipmentsPage() {
  const { address: userAddress, isConnected } = useAccount();
  const [productId, setProductId] = useState("1");
  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");
  const [dbShipments, setDbShipments] = useState<DbShipmentRecord[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const { data: nextShipmentId } = useReadContract({
    address: CONTRACTS.registry,
    abi: registryAbi,
    functionName: "nextShipmentId",
  });
  const shipmentId = nextShipmentId && nextShipmentId > 1n ? nextShipmentId - 1n : 1n;

  const { data: shipment, refetch } = useReadContract({
    address: CONTRACTS.registry,
    abi: registryAbi,
    functionName: "shipments",
    args: [shipmentId],
  });

  const { writeContract, data: transactionHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: transactionHash });

  const record = shipment as ContractShipmentRecord | undefined;
  const shipmentExists = record?.[5] === true;
  const status = record ? shipmentStatuses[record[4]] ?? "UNKNOWN" : "EMPTY";

  const loadDbShipments = async () => {
    setIsLoadingDb(true);
    try {
      const records = await fetchShipments();
      setDbShipments(records);
    } catch {
      // Supabase table might still need migration or be empty
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    void loadDbShipments();
  }, []);

  useEffect(() => {
    if (isSuccess && transactionHash) {
      void refetch();
      // Sync on-chain confirmation to Supabase
      if (record && shipmentExists) {
        createShipmentRecord({
          id: record[0].toString(),
          on_chain_shipment_id: record[0].toString(),
          product_id: record[1].toString(),
          status: shipmentStatuses[record[4]] ?? "CREATED",
          chain_tx_hash: transactionHash,
        })
          .catch(() => {})
          .finally(() => {
            void loadDbShipments();
          });
      }
    }
  }, [isSuccess, transactionHash]);

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!isConnected) {
      setMessage("Connect a Hedera wallet first.");
      return;
    }

    if (!isAddress(receiver)) {
      setMessage("Enter a valid receiver address.");
      return;
    }

    writeContract(
      {
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "createShipment",
        args: [BigInt(productId), receiver],
      },
      {
        onSuccess: (hash) => {
          setMessage(`Shipment submitted. Tx: ${hash.slice(0, 10)}...`);
          // Optimistically store record
          if (nextShipmentId && userAddress) {
            createShipmentRecord({
              id: nextShipmentId.toString(),
              on_chain_shipment_id: nextShipmentId.toString(),
              product_id: productId,
              sender_org_id: userAddress,
              receiver_org_id: receiver,
              status: "CREATED",
              chain_tx_hash: hash,
            }).catch(() => {});
          }
        },
        onError: (error) => setMessage(error.message),
      }
    );
  };

  const acceptShipment = () => {
    if (!record) return;

    writeContract(
      {
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "acceptShipment",
        args: [record[0]],
      },
      {
        onSuccess: (hash) => {
          setMessage(`Shipment acceptance submitted. Tx: ${hash.slice(0, 10)}...`);
          updateShipmentRecord(record[0].toString(), {
            status: "RECEIVED",
            chain_tx_hash: hash,
          })
            .catch(() => {})
            .finally(() => {
              void loadDbShipments();
            });
        },
        onError: (error) => setMessage(error.message),
      }
    );
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="mx-auto max-w-350 p-6 lg:p-10">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Operations</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Shipments</h1>
                <p className="mt-2 text-sm text-gray-500">Live smart contract custody operations synced to Supabase.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadDbShipments}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-black"
                >
                  <RefreshCw size={12} className={isLoadingDb ? "animate-spin" : ""} />
                  Sync DB
                </button>
                <StatusBadge status={isConnected ? "CONNECTED" : "PENDING"} />
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
              {/* Shipment Creation Form */}
              <form onSubmit={submitCreate} className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2">
                  <Plus size={15} />
                  <h2 className="text-sm font-semibold">Create shipment</h2>
                </div>

                <label className="mt-6 block text-[10px] uppercase tracking-wider text-gray-400">Product ID</label>
                <input
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
                  inputMode="numeric"
                />

                <label className="mt-4 block text-[10px] uppercase tracking-wider text-gray-400">Receiver wallet</label>
                <input
                  value={receiver}
                  onChange={(event) => setReceiver(event.target.value)}
                  placeholder="0x..."
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs outline-none focus:border-black"
                />

                <button
                  disabled={isPending || isConfirming}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Truck size={14} />
                  {isPending || isConfirming ? "Confirming..." : "Create shipment"}
                </button>

                {message && <p className="mt-4 wrap-break-word text-xs text-gray-500">{message}</p>}
              </form>

              {/* Latest On-chain Record */}
              <section className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Latest on-chain record</p>
                    <h2 className="mt-2 text-xl font-semibold">Shipment #{shipmentId.toString()}</h2>
                  </div>
                  <StatusBadge status={shipmentExists ? status : "PENDING"} />
                </div>

                {shipmentExists && record ? (
                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <Detail label="Product" value={`#${record[1].toString()}`} />
                    <Detail label="Status" value={status} />
                    <Detail label="Sender" value={record[2]} mono />
                    <Detail label="Receiver" value={record[3]} mono />
                  </div>
                ) : (
                  <div className="mt-12 flex flex-col items-center justify-center text-center text-gray-400">
                    <Search size={22} />
                    <p className="mt-3 text-sm">No shipment found yet on chain.</p>
                  </div>
                )}

                {shipmentExists && status !== "RECEIVED" && (
                  <button
                    onClick={acceptShipment}
                    disabled={isPending || isConfirming}
                    className="mt-8 flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-xs font-medium hover:border-black disabled:opacity-40"
                  >
                    <Check size={14} /> Accept shipment as receiver
                  </button>
                )}
              </section>
            </div>

            {/* Database-Backed Shipments History */}
            <section className="mt-8 rounded-xl border border-gray-200 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Database-backed Shipment History</h2>
                  <p className="text-xs text-gray-400">Persisted in Supabase PostgreSQL with verified transaction hashes</p>
                </div>
                <span className="text-xs text-gray-500">{dbShipments.length} record(s)</span>
              </div>

              {dbShipments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400">
                        <th className="pb-3 font-semibold">Shipment ID</th>
                        <th className="pb-3 font-semibold">Product</th>
                        <th className="pb-3 font-semibold">Sender</th>
                        <th className="pb-3 font-semibold">Receiver</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Transaction</th>
                        <th className="pb-3 font-semibold">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dbShipments.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50/60">
                          <td className="py-3 font-semibold">
                            <Link className="underline underline-offset-2" href={`/shipments/${s.on_chain_shipment_id ?? s.id}`}>
                              #{s.on_chain_shipment_id ?? s.id}
                            </Link>
                          </td>
                          <td className="py-3">#{s.product_id}</td>
                          <td className="py-3 font-mono text-[11px] text-gray-600">{s.sender_org_id?.slice(0, 10) ?? "—"}</td>
                          <td className="py-3 font-mono text-[11px] text-gray-600">{s.receiver_org_id?.slice(0, 10) ?? "—"}</td>
                          <td className="py-3">
                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-800">
                              {s.status}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-[11px]">
                            {s.chain_tx_hash ? (
                              <span className="flex items-center gap-1 text-gray-600">
                                {s.chain_tx_hash.slice(0, 10)}...
                                <ExternalLink size={10} />
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-3 text-gray-400">
                            {s.created_at ? new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-gray-400">
                  No shipments logged in Supabase yet. Create a shipment above or sync to populate.
                </p>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-2 break-all text-sm ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</p>
    </div>
  );
}
