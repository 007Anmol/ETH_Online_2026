"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleDollarSign, ExternalLink } from "lucide-react";
import { formatEther } from "viem";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import StatusBadge from "@/components/team2/StatusBadge";
import { hashscanTx } from "@/lib/blockchain/explorer";
import { fetchEscrows, type EscrowRecord } from "@/lib/supabase";

export default function PaymentsPage() {
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);

  useEffect(() => {
    void fetchEscrows()
      .then(setEscrows)
      .catch(() => setEscrows([]));
  }, []);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="mx-auto max-w-[1200px] p-6 lg:p-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Settlement Layer</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Payments</h1>
            <p className="mt-2 text-sm text-gray-500">
              Hedera Testnet escrow records. Run a live sale on{" "}
              <Link href="/settlement" className="underline">
                Sale
              </Link>
              .
            </p>

            <div className="mt-8 rounded-xl border border-gray-200 p-8">
              <div className="grid gap-6 md:grid-cols-5 md:items-center">
                <PaymentNode title="Seller" subtitle="NFT custodian" />
                <Arrow />
                <PaymentNode title="Escrow" subtitle="HBAR locked on Hedera" />
                <Arrow />
                <PaymentNode title="Release" subtitle="After DELIVERED" />
              </div>
            </div>

            <section className="mt-8 rounded-xl border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-5">
                <h2 className="text-sm font-semibold">On-chain escrow records</h2>
              </div>
              {escrows.length === 0 ? (
                <p className="px-6 py-8 text-xs text-gray-400">No escrow rows in Supabase yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {escrows.map((escrow) => (
                    <PaymentRow
                      key={escrow.id}
                      shipment={`Product ${escrow.product_id}`}
                      amount={formatAmount(escrow.amount)}
                      status={escrow.status}
                      hash={escrow.chain_tx_hash ?? ""}
                    />
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function formatAmount(amount?: string | number | null) {
  if (amount === undefined || amount === null || amount === "") return "—";
  try {
    return `${formatEther(BigInt(amount))} HBAR`;
  } catch {
    return `${amount} HBAR`;
  }
}

function PaymentNode({ title, subtitle }: { title: string; subtitle: string }) {
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
        <p className="mt-1 text-[10px] text-gray-400">Hedera escrow</p>
      </div>
      <p className="text-sm font-semibold">{amount}</p>
      <StatusBadge status={status} />
      {hash ? (
        <a href={hashscanTx(hash)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-black">
          {hash.slice(0, 10)}...
          <ExternalLink size={11} />
        </a>
      ) : (
        <span className="text-[10px] text-gray-300">no tx</span>
      )}
    </div>
  );
}
