"use client";

import { FormEvent, useEffect, useState } from "react";
import { CircleDollarSign, ExternalLink, LockKeyhole, RefreshCw, ShieldCheck, ShieldAlert } from "lucide-react";
import { isAddress, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import StatusBadge from "@/components/team2/StatusBadge";
import { CONTRACTS } from "@/lib/contracts";
import { escrowAbi } from "@/lib/escrowAbi";
import { hookAbi } from "@/lib/hookAbi";
import {
  fetchEscrows,
  saveEscrowRecord,
  type EscrowRecord as DbEscrowRecord,
} from "@/lib/supabase";

const escrowStatuses = ["ACTIVE", "FROZEN", "RELEASED"] as const;

type ContractEscrowRecord = readonly [bigint, `0x${string}`, `0x${string}`, bigint, number];

export default function EscrowPage() {
  const { address: userAddress, isConnected } = useAccount();
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [productId, setProductId] = useState("1");
  const [message, setMessage] = useState("");
  const [dbEscrows, setDbEscrows] = useState<DbEscrowRecord[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const { data: nextEscrowId } = useReadContract({
    address: CONTRACTS.escrow,
    abi: escrowAbi,
    functionName: "nextEscrowId",
  });
  const escrowId = nextEscrowId && nextEscrowId > 1n ? nextEscrowId - 1n : 1n;

  const { data: escrow, refetch: refetchEscrow } = useReadContract({
    address: CONTRACTS.escrow,
    abi: escrowAbi,
    functionName: "escrows",
    args: [escrowId],
  });

  const { data: canSettle, refetch: refetchHook } = useReadContract({
    address: CONTRACTS.hook,
    abi: hookAbi,
    functionName: "canSettle",
    args: [BigInt(productId), escrowId],
  });

  const { writeContract, isPending } = useWriteContract();
  const record = escrow as ContractEscrowRecord | undefined;
  const exists = Boolean(record && record[3] > 0n);
  const status = record ? escrowStatuses[record[4]] ?? "UNKNOWN" : "EMPTY";

  const loadDbEscrows = async () => {
    setIsLoadingDb(true);
    try {
      const records = await fetchEscrows();
      setDbEscrows(records);
    } catch {
      // Supabase table might still need migration or be empty
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    void loadDbEscrows();
  }, []);

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConnected) return setMessage("Connect a Hedera wallet first.");
    if (!isAddress(payee)) return setMessage("Enter a valid payee address.");

    writeContract(
      {
        address: CONTRACTS.escrow,
        abi: escrowAbi,
        functionName: "createEscrow",
        args: [BigInt(productId), payee],
        value: parseEther(amount),
      },
      {
        onSuccess: (hash) => {
          setMessage(`Escrow created. Tx: ${hash.slice(0, 10)}...`);
          if (userAddress) {
            saveEscrowRecord({
              id: (nextEscrowId ?? 1n).toString(),
              product_id: productId,
              amount: parseEther(amount).toString(),
              currency: "HBAR",
              status: "LOCKED",
              chain_tx_hash: hash,
            })
              .catch(() => {})
              .finally(() => {
                void loadDbEscrows();
                void refetchEscrow();
                void refetchHook();
              });
          }
        },
        onError: (error) => setMessage(error.message),
      }
    );
  };

  const action = (functionName: "freezeEscrowPool" | "resolveEscrow" | "releaseEscrow") => {
    const isPoolAction = functionName === "freezeEscrowPool";
    writeContract(
      {
        address: CONTRACTS.escrow,
        abi: escrowAbi,
        functionName,
        args: isPoolAction ? [BigInt(productId)] : [escrowId],
      } as never,
      {
        onSuccess: (hash) => {
          setMessage(`${functionName} confirmed. Tx: ${hash.slice(0, 10)}...`);
          void refetchEscrow();
          void refetchHook();
          void loadDbEscrows();
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
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Settlement</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Programmable Escrow</h1>
                  <p className="mt-2 text-sm text-gray-500">
                    HBAR escrow controlled by Hedera EVM state and gated by the Uniswap v4 Hook.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadDbEscrows}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-black"
                >
                  <RefreshCw size={12} className={isLoadingDb ? "animate-spin" : ""} />
                  Sync DB
                </button>
                <StatusBadge status={isConnected ? "CONNECTED" : "PENDING"} />
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
              {/* Escrow Funding Form */}
              <form onSubmit={create} className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2">
                  <CircleDollarSign size={15} />
                  <h2 className="text-sm font-semibold">Create escrow</h2>
                </div>
                <Field label="Product ID" value={productId} setValue={setProductId} />
                <Field label="Payee wallet" value={payee} setValue={setPayee} />
                <Field label="Amount in HBAR" value={amount} setValue={setAmount} />
                <button
                  disabled={isPending}
                  className="mt-5 w-full rounded-lg bg-black px-4 py-3 text-xs font-medium text-white disabled:opacity-40"
                >
                  Fund escrow
                </button>
                {message && <p className="mt-4 wrap-break-word text-xs text-gray-500">{message}</p>}
              </form>

              {/* Latest Escrow & Hook Enforcement Card */}
              <section className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Latest on-chain escrow</p>
                    <h2 className="mt-2 text-xl font-semibold">Escrow #{escrowId.toString()}</h2>
                  </div>
                  <StatusBadge status={exists ? status : "PENDING"} />
                </div>

                {exists && record ? (
                  <>
                    <div className="mt-8 grid gap-5 sm:grid-cols-3">
                      <Detail label="Product" value={`#${record[0].toString()}`} />
                      <Detail label="Amount" value={`${record[3].toString()} wei`} />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">Uniswap v4 Hook</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          {canSettle ? (
                            <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                              <ShieldCheck size={13} />
                              SWAP SETTLEMENT ALLOWED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                              <ShieldAlert size={13} />
                              SWAP SETTLEMENT BLOCKED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        onClick={() => action("freezeEscrowPool")}
                        disabled={isPending}
                        className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-2.5 text-xs font-medium text-red-800 hover:bg-red-50"
                      >
                        <LockKeyhole size={14} className="mr-2 inline" />
                        Freeze escrow pool
                      </button>

                      {status === "FROZEN" && (
                        <button
                          onClick={() => action("resolveEscrow")}
                          disabled={isPending}
                          className="rounded-lg border border-gray-200 px-4 py-2.5 text-xs font-medium hover:border-black"
                        >
                          Resolve escrow
                        </button>
                      )}

                      {status === "ACTIVE" && (
                        <button
                          onClick={() => action("releaseEscrow")}
                          disabled={isPending}
                          className="rounded-lg bg-black px-4 py-2.5 text-xs font-medium text-white hover:bg-gray-800"
                        >
                          <ShieldCheck size={14} className="mr-2 inline" />
                          Release escrow
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-12 text-center text-sm text-gray-400">
                    Create an escrow to exercise settlement controls.
                  </p>
                )}
              </section>
            </div>

            {/* Database-Backed Escrow Records */}
            <section className="mt-8 rounded-xl border border-gray-200 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Database-backed Escrow Records</h2>
                  <p className="text-xs text-gray-400">Synced to Supabase PostgreSQL with transaction hashes</p>
                </div>
                <span className="text-xs text-gray-500">{dbEscrows.length} record(s)</span>
              </div>

              {dbEscrows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400">
                        <th className="pb-3 font-semibold">Escrow ID</th>
                        <th className="pb-3 font-semibold">Product</th>
                        <th className="pb-3 font-semibold">Payer</th>
                        <th className="pb-3 font-semibold">Payee</th>
                        <th className="pb-3 font-semibold">Amount (Wei)</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Transaction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dbEscrows.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50/60">
                          <td className="py-3 font-semibold">#{e.id}</td>
                          <td className="py-3">#{e.product_id}</td>
                          <td className="py-3 font-mono text-[11px] text-gray-600">{e.buyer_org_id?.slice(0, 10) ?? "—"}</td>
                          <td className="py-3 font-mono text-[11px] text-gray-600">{e.seller_org_id?.slice(0, 10) ?? "—"}</td>
                          <td className="py-3 font-mono">{e.amount ?? "—"}</td>
                          <td className="py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              e.status === "LOCKED" ? "bg-blue-50 text-blue-700" :
                              e.status === "FROZEN" ? "bg-red-50 text-red-700" :
                              "bg-green-50 text-green-700"
                            }`}>
                              {e.status}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-[11px]">
                            {e.chain_tx_hash ? (
                              <span className="flex items-center gap-1 text-gray-600">
                                {e.chain_tx_hash.slice(0, 10)}...
                                <ExternalLink size={10} />
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-gray-400">
                  No escrows logged in Supabase yet. Fund an escrow above or sync to populate.
                </p>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <label className="mt-4 block text-[10px] uppercase tracking-wider text-gray-400">
      {label}
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-black outline-none focus:border-black"
      />
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-2 break-all text-sm font-medium">{value}</p>
    </div>
  );
}
