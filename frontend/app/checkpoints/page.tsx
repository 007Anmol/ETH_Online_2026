"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, MapPin, Radio } from "lucide-react";
import { keccak256, toBytes } from "viem";
import { useAccount, useWriteContract } from "wagmi";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import StatusBadge from "@/components/team2/StatusBadge";
import { CONTRACTS } from "@/lib/contracts";
import { escrowAbi } from "@/lib/escrowAbi";
import { registryAbi } from "@/lib/registryAbi";
import type { RiskResult, TelemetryPoint } from "@/lib/risk";

export default function CheckpointsPage() {
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [productId, setProductId] = useState("1");
  const [checkpoint, setCheckpoint] = useState("New York");
  const [latitude, setLatitude] = useState("40.7128");
  const [longitude, setLongitude] = useState("-74.0060");
  const [timestamp, setTimestamp] = useState(String(Math.floor(Date.now() / 1000)));
  const [expectedRoute, setExpectedRoute] = useState("Mumbai, Dubai, London");
  const [actualRoute, setActualRoute] = useState("Mumbai, New York");
  const [previous, setPrevious] = useState<TelemetryPoint>({
    productId: "1",
    checkpoint: "Mumbai",
    latitude: 19.076,
    longitude: 72.8777,
    timestamp: Math.floor(Date.now() / 1000) - 1800,
  });
  const [result, setResult] = useState<RiskResult | null>(null);
  const [message, setMessage] = useState("");

  const analyzeAndRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const current: TelemetryPoint = {
      productId,
      checkpoint,
      latitude: Number(latitude),
      longitude: Number(longitude),
      timestamp: Number(timestamp),
      expectedRoute: expectedRoute.split(",").map((item) => item.trim()).filter(Boolean),
      actualRoute: actualRoute.split(",").map((item) => item.trim()).filter(Boolean),
    };

    const response = await fetch("/api/checkpoints", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ current, previous }),
    });

    const analysis = (await response.json()) as RiskResult & { error?: string };
    if (!response.ok) {
      setMessage(analysis.error ?? "Checkpoint analysis failed.");
      return;
    }

    setResult(analysis);

    if (!isConnected) {
      setMessage("Analysis complete. Connect an Anvil wallet to record it on-chain.");
      return;
    }

    writeContract(
      {
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "recordCheckpoint",
        args: [
          BigInt(productId),
          BigInt(current.timestamp),
          BigInt(Math.round(current.latitude * 1_000_000)),
          BigInt(Math.round(current.longitude * 1_000_000)),
          keccak256(toBytes(current.checkpoint)),
        ],
      },
      {
        onSuccess: () => setMessage("Checkpoint recorded on-chain."),
        onError: (error) => setMessage(error.message),
      },
    );
  };

  const freezeEscrow = () => {
    if (!result || result.riskScore < 61) return;

    writeContract(
      {
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "recordAnomaly",
        args: [BigInt(productId), BigInt(result.riskScore), keccak256(toBytes(result.explanation))],
      },
      {
        onSuccess: () => {
          writeContract(
            {
              address: CONTRACTS.escrow,
              abi: escrowAbi,
              functionName: "freezeEscrowPool",
              args: [BigInt(productId)],
            },
            {
              onSuccess: () => setMessage("Anomaly recorded and escrow pool frozen."),
              onError: (error) => setMessage(error.message),
            },
          );
        },
        onError: (error) => setMessage(error.message),
      },
    );
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex"><Sidebar /><div className="min-w-0 flex-1"><Topbar />
        <main className="mx-auto max-w-[1200px] p-6 lg:p-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Telemetry</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Checkpoint analysis</h1>
          <p className="mt-2 text-sm text-gray-500">Run deterministic movement checks before anchoring a checkpoint.</p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
            <form onSubmit={analyzeAndRecord} className="rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2"><MapPin size={15} /><h2 className="text-sm font-semibold">Record telemetry</h2></div>
              <Field label="Product ID" value={productId} setValue={setProductId} />
              <Field label="Checkpoint" value={checkpoint} setValue={setCheckpoint} />
              <div className="grid grid-cols-2 gap-3"><Field label="Latitude" value={latitude} setValue={setLatitude} /><Field label="Longitude" value={longitude} setValue={setLongitude} /></div>
              <Field label="Timestamp" value={timestamp} setValue={setTimestamp} />
              <Field label="Expected route" value={expectedRoute} setValue={setExpectedRoute} />
              <Field label="Observed route" value={actualRoute} setValue={setActualRoute} />
              <Field label="Previous checkpoint" value={previous.checkpoint} setValue={(value) => setPrevious({ ...previous, checkpoint: value })} />
              <button disabled={isPending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-xs font-medium text-white disabled:opacity-40"><Radio size={14} /> Analyze and record</button>
              {message && <p className="mt-4 break-words text-xs text-gray-500">{message}</p>}
            </form>

            <section className="rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Deterministic engine</p><h2 className="mt-2 text-xl font-semibold">Risk decision</h2></div>{result && <StatusBadge status={result.level} />}</div>
              {!result ? <div className="mt-16 text-center text-sm text-gray-400">Submit telemetry to see the decision.</div> : <><div className="mt-8 flex items-end gap-3"><span className="text-5xl font-semibold">{result.riskScore}</span><span className="pb-2 text-xs text-gray-400">/ 100 risk score</span></div><p className="mt-5 text-sm leading-6 text-gray-600">{result.explanation}</p><div className="mt-6 space-y-3">{result.findings.map((finding) => <div key={finding.type} className="flex gap-3 rounded-lg border border-gray-200 p-3"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><div><p className="text-xs font-semibold">{finding.type.replaceAll("_", " ")} <span className="font-normal text-gray-400">+{finding.points}</span></p><p className="mt-1 text-xs text-gray-500">{finding.message}</p></div></div>)}</div>{result.riskScore >= 61 && <button onClick={freezeEscrow} disabled={isPending} className="mt-6 rounded-lg bg-black px-4 py-3 text-xs font-medium text-white disabled:opacity-40">Record anomaly + freeze escrow</button>}</>}
            </section>
          </div>
        </main>
      </div></div>
    </div>
  );
}

function Field({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
  return <label className="mt-4 block text-[10px] uppercase tracking-wider text-gray-400">{label}<input value={value} onChange={(event) => setValue(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-black outline-none focus:border-black" /></label>;
}