"use client";

import { FormEvent, useState } from "react";
import { Check, Plus, Search, Truck } from "lucide-react";
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

const shipmentStatuses = ["CREATED", "IN_TRANSIT", "RECEIVED", "CANCELLED"];

type ShipmentRecord = readonly [
  bigint,
  bigint,
  `0x${string}`,
  `0x${string}`,
  number,
  boolean,
];

export default function ShipmentsPage() {
  const { isConnected } = useAccount();
  const [productId, setProductId] = useState("1");
  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");
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
  const record = shipment as ShipmentRecord | undefined;
  const shipmentExists = record?.[5] === true;
  const status = record ? shipmentStatuses[record[4]] ?? "UNKNOWN" : "EMPTY";

  if (isSuccess) {
    void refetch();
  }

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!isConnected) {
      setMessage("Connect an Anvil wallet first.");
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
        onSuccess: () => setMessage("Shipment submitted. Waiting for confirmation..."),
        onError: (error) => setMessage(error.message),
      },
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
        onSuccess: () => setMessage("Shipment acceptance submitted."),
        onError: (error) => setMessage(error.message),
      },
    );
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="mx-auto max-w-[1400px] p-6 lg:p-10">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Operations</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Shipments</h1>
                <p className="mt-2 text-sm text-gray-500">Live registry shipment and custody operations.</p>
              </div>
              <StatusBadge status={isConnected ? "CONNECTED" : "PENDING"} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
              <form onSubmit={submitCreate} className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2"><Plus size={15} /><h2 className="text-sm font-semibold">Create shipment</h2></div>
                <label className="mt-6 block text-[10px] uppercase tracking-wider text-gray-400">Product ID</label>
                <input value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black" inputMode="numeric" />
                <label className="mt-4 block text-[10px] uppercase tracking-wider text-gray-400">Receiver wallet</label>
                <input value={receiver} onChange={(event) => setReceiver(event.target.value)} placeholder="0x..." className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs outline-none focus:border-black" />
                <button disabled={isPending || isConfirming} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"><Truck size={14} />{isPending || isConfirming ? "Confirming..." : "Create shipment"}</button>
                {message && <p className="mt-4 break-words text-xs text-gray-500">{message}</p>}
              </form>

              <section className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Latest on-chain record</p><h2 className="mt-2 text-xl font-semibold">Shipment #{shipmentId.toString()}</h2></div>
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
                  <div className="mt-12 flex flex-col items-center justify-center text-center text-gray-400"><Search size={22} /><p className="mt-3 text-sm">No shipment found yet.</p></div>
                )}
                {shipmentExists && status !== "RECEIVED" && <button onClick={acceptShipment} disabled={isPending || isConfirming} className="mt-8 flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-xs font-medium hover:border-black disabled:opacity-40"><Check size={14} /> Accept shipment as receiver</button>}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p><p className={`mt-2 break-all text-sm ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</p></div>;
}
