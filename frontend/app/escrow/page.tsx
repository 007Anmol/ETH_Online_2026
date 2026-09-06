"use client";

import { FormEvent, useState } from "react";
import { CircleDollarSign, LockKeyhole, ShieldCheck } from "lucide-react";
import { isAddress, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import StatusBadge from "@/components/team2/StatusBadge";
import { CONTRACTS } from "@/lib/contracts";
import { escrowAbi } from "@/lib/escrowAbi";
import { hookAbi } from "@/lib/hookAbi";

const escrowStatuses = ["ACTIVE", "FROZEN", "RELEASED"];

type EscrowRecord = readonly [bigint, `0x${string}`, `0x${string}`, bigint, number];

export default function EscrowPage() {
  const { isConnected } = useAccount();
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [productId, setProductId] = useState("1");
  const [message, setMessage] = useState("");
  const { data: nextEscrowId } = useReadContract({ address: CONTRACTS.escrow, abi: escrowAbi, functionName: "nextEscrowId" });
  const escrowId = nextEscrowId && nextEscrowId > 1n ? nextEscrowId - 1n : 1n;
  const { data: escrow } = useReadContract({ address: CONTRACTS.escrow, abi: escrowAbi, functionName: "escrows", args: [escrowId] });
  const { data: canSettle } = useReadContract({ address: CONTRACTS.hook, abi: hookAbi, functionName: "canSettle", args: [BigInt(productId), escrowId] });
  const { writeContract, isPending } = useWriteContract();
  const record = escrow as EscrowRecord | undefined;
  const exists = Boolean(record && record[3] > 0n);
  const status = record ? escrowStatuses[record[4]] ?? "UNKNOWN" : "EMPTY";

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConnected) return setMessage("Connect an Anvil wallet first.");
    if (!isAddress(payee)) return setMessage("Enter a valid payee address.");
    writeContract({ address: CONTRACTS.escrow, abi: escrowAbi, functionName: "createEscrow", args: [BigInt(productId), payee], value: parseEther(amount) }, { onSuccess: () => setMessage("Escrow created."), onError: (error) => setMessage(error.message) });
  };

  const action = (functionName: "freezeEscrowPool" | "resolveEscrow" | "releaseEscrow") => {
    writeContract({ address: CONTRACTS.escrow, abi: escrowAbi, functionName, args: functionName === "freezeEscrowPool" ? [BigInt(productId)] : [escrowId] } as never, { onSuccess: () => setMessage(`${functionName} confirmed.`), onError: (error) => setMessage(error.message) });
  };

  return <div className="min-h-screen bg-white text-black"><div className="flex"><Sidebar /><div className="min-w-0 flex-1"><Topbar /><main className="mx-auto max-w-[1200px] p-6 lg:p-10"><p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Settlement</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Escrow</h1><p className="mt-2 text-sm text-gray-500">Live escrow state connected to the registry and settlement hook.</p>
    <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]"><form onSubmit={create} className="rounded-xl border border-gray-200 p-6"><div className="flex items-center gap-2"><CircleDollarSign size={15} /><h2 className="text-sm font-semibold">Create escrow</h2></div><Field label="Product ID" value={productId} setValue={setProductId} /><Field label="Payee wallet" value={payee} setValue={setPayee} /><Field label="Amount in ETH" value={amount} setValue={setAmount} /><button disabled={isPending} className="mt-5 w-full rounded-lg bg-black px-4 py-3 text-xs font-medium text-white disabled:opacity-40">Fund escrow</button>{message && <p className="mt-4 break-words text-xs text-gray-500">{message}</p>}</form>
      <section className="rounded-xl border border-gray-200 p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Latest escrow</p><h2 className="mt-2 text-xl font-semibold">Escrow #{escrowId.toString()}</h2></div><StatusBadge status={exists ? status : "PENDING"} /></div>{exists && record ? <><div className="mt-8 grid gap-5 sm:grid-cols-3"><Detail label="Product" value={`#${record[0].toString()}`} /><Detail label="Amount" value={`${record[3].toString()} wei`} /><Detail label="Hook" value={canSettle ? "SETTLEMENT ALLOWED" : "SETTLEMENT BLOCKED"} /></div><div className="mt-8 flex flex-wrap gap-3"><button onClick={() => action("freezeEscrowPool")} disabled={isPending} className="rounded-lg border border-gray-200 px-4 py-2.5 text-xs hover:border-black"><LockKeyhole size={14} className="mr-2 inline" />Freeze pool</button>{status === "FROZEN" && <button onClick={() => action("resolveEscrow")} disabled={isPending} className="rounded-lg border border-gray-200 px-4 py-2.5 text-xs hover:border-black">Resolve escrow</button>}{status === "ACTIVE" && <button onClick={() => action("releaseEscrow")} disabled={isPending} className="rounded-lg bg-black px-4 py-2.5 text-xs text-white"><ShieldCheck size={14} className="mr-2 inline" />Release escrow</button>}</div></> : <p className="mt-12 text-center text-sm text-gray-400">Create an escrow to exercise settlement controls.</p>}</section></div>
  </main></div></div></div>;
}

function Field({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) { return <label className="mt-4 block text-[10px] uppercase tracking-wider text-gray-400">{label}<input value={value} onChange={(event) => setValue(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-black outline-none focus:border-black" /></label>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p><p className="mt-2 break-all text-sm font-medium">{value}</p></div>; }
