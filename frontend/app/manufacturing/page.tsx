"use client";

import { FormEvent, useState } from "react";
import { Factory } from "lucide-react";
import { isAddress, stringToHex } from "viem";
import { useAccount, useWriteContract } from "wagmi";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import { CONTRACTS } from "@/lib/contracts";
import { registryAbi } from "@/lib/registryAbi";

export default function ManufacturingPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [productId, setProductId] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [tagId, setTagId] = useState("");
  const [custodian, setCustodian] = useState("");
  const [message, setMessage] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!isConnected || !connectedAddress) {
      setMessage("Connect the owner wallet first.");
      return;
    }
    if (!isAddress(custodian)) {
      setMessage("Enter a valid initial custodian address.");
      return;
    }

    try {
      writeContract(
        {
          address: CONTRACTS.registry,
          abi: registryAbi,
          functionName: "registerProduct",
          args: [
            BigInt(productId),
            BigInt(tokenId),
            stringToHex(batchId, { size: 32 }),
            stringToHex(serialNumber, { size: 32 }),
            stringToHex(tagId, { size: 32 }),
            custodian,
          ],
        },
        {
          onSuccess: (hash) => setMessage(`Product registered. Tx: ${hash.slice(0, 10)}...`),
          onError: (error) => setMessage(error.message),
        }
      );
    } catch {
      setMessage("Product and metadata fields must be valid and fit in 32 bytes.");
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="mx-auto max-w-225 p-6 lg:p-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Manufacturing</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Register product</h1>
            <p className="mt-2 text-sm text-gray-500">Create the on-chain product before sending it through custody.</p>

            <form onSubmit={submit} className="mt-8 rounded-xl border border-gray-200 p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Product ID" value={productId} setValue={setProductId} numeric />
                <Field label="Token ID" value={tokenId} setValue={setTokenId} numeric />
                <Field label="Batch ID" value={batchId} setValue={setBatchId} />
                <Field label="Serial number" value={serialNumber} setValue={setSerialNumber} />
                <Field label="NFC tag ID" value={tagId} setValue={setTagId} />
                <Field label="Initial custodian wallet" value={custodian} setValue={setCustodian} />
              </div>

              <button
                disabled={isPending}
                className="mt-6 flex items-center gap-2 rounded-lg bg-black px-4 py-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Factory size={14} />
                {isPending ? "Confirming..." : "Register product"}
              </button>
              {message && <p className="mt-4 wrap-break-word text-xs text-gray-500">{message}</p>}
            </form>
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
  numeric = false,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  numeric?: boolean;
}) {
  return (
    <label className="block text-[10px] uppercase tracking-wider text-gray-400">
      {label}
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        inputMode={numeric ? "numeric" : undefined}
        className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm normal-case tracking-normal text-black outline-none focus:border-black"
      />
    </label>
  );
}