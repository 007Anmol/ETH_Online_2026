"use client";

import { FormEvent, useEffect, useState } from "react";
import { Factory } from "lucide-react";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { hedera } from "@/lib/blockchain/wagmi";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import {
  bindTagOnChain,
  createBatchOnChain,
  deriveOnChainId,
  hasRegistryAddress,
  mintBatchOnChain,
  readBatch,
  readProduct,
  readRegistryOwner,
  readTag,
} from "@/lib/blockchain";
import {
  hasBrowserSupabaseConfig,
} from "@/lib/supabase";
import type { ManufacturerPermission } from "@/lib/blockchain/types";

type Mode = "createBatch" | "mintBatch" | "bindTag" | "lookup";

async function fetchWalletAccess(wallet: string, permission: ManufacturerPermission) {
  const params = new URLSearchParams({ wallet, permission });
  const res = await fetch(`/api/auth/wallet-access?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || "Permission lookup failed");
  }
  return body as {
    allowed: boolean;
    reason?: string;
    profile?: { role?: string } | null;
    organization?: { name?: string } | null;
  };
}

export default function ManufacturingPage() {
  const { address: connectedAddress, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const onHedera = chainId === hedera.id;
  const [mode, setMode] = useState<Mode>("createBatch");
  const [batchCode, setBatchCode] = useState("RADO-2026-001");
  const [quantity, setQuantity] = useState("1");
  const [productCodes, setProductCodes] = useState("VC-RADO2026001-000001");
  const [productCode, setProductCode] = useState("VC-RADO2026001-000001");
  const [tagUid, setTagUid] = useState("04DEADBEEF01");
  const [message, setMessage] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [canWrite, setCanWrite] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      if (!connectedAddress) {
        if (!cancelled) {
          setCanWrite(false);
          setAuthMessage("Connect a wallet mapped to a manufacturer profile.");
        }
        return;
      }

      if (!hasBrowserSupabaseConfig()) {
        if (!cancelled) {
          setCanWrite(false);
          setAuthMessage(
            "Supabase env not loaded in the browser. Put NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local, then restart `npm run dev`.",
          );
        }
        return;
      }

      try {
        const permission: ManufacturerPermission =
          mode === "createBatch"
            ? "CREATE_BATCH"
            : mode === "mintBatch"
              ? "MINT_PRODUCT"
              : mode === "bindTag"
                ? "REGISTER_TAG"
                : "VIEW_PROVENANCE";
        const result = await fetchWalletAccess(connectedAddress, permission);
        if (cancelled) return;
        setCanWrite(Boolean(result.allowed));
        setAuthMessage(
          result.allowed
            ? `${result.organization?.name ?? "Organization"} · ${result.profile?.role}`
            : result.reason ?? "Not authorized",
        );
      } catch (error) {
        if (!cancelled) {
          setCanWrite(false);
          setAuthMessage(error instanceof Error ? error.message : "Authorization lookup failed");
        }
      }
    }

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [connectedAddress, mode]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!isConnected || !connectedAddress) {
      setMessage("Connect the Team 1 registry owner wallet in the top bar first.");
      return;
    }
    if (!onHedera) {
      setMessage(`MetaMask is on chain ${chainId ?? "unknown"}. Switch to Hedera Testnet (${hedera.id}) and retry.`);
      return;
    }
    if (!walletClient) {
      setMessage("Wallet is connected but not ready to sign. Switch MetaMask to Hedera Testnet (296), then reconnect.");
      return;
    }
    if (!hasRegistryAddress()) {
      setMessage("Set NEXT_PUBLIC_REGISTRY_ADDRESS to the deployed Team 1 registry.");
      return;
    }
    if (!canWrite && mode !== "lookup") {
      setMessage(authMessage || "Database role/permission check failed.");
      return;
    }

    try {
      const owner = await readRegistryOwner();
      if (mode !== "lookup" && owner.toLowerCase() !== connectedAddress.toLowerCase()) {
        setMessage(
          `Connected wallet is not the registry owner (${owner}). createBatch/mintBatch/bindTag are onlyOwner.`,
        );
        return;
      }

      if (mode === "createBatch") {
        const qty = Number(quantity);
        if (!Number.isInteger(qty) || qty <= 0) {
          setMessage("Quantity must be a positive integer.");
          return;
        }
        const { txHash, batchIdHash } = await createBatchOnChain(
          { ...walletClient, account: walletClient.account! },
          { batchCode, quantity: qty },
        );
        setMessage(`Batch created. hash=${batchIdHash} tx=${txHash}`);
        return;
      }

      if (mode === "mintBatch") {
        const codes = productCodes
          .split(/[\n,]+/)
          .map((value) => value.trim())
          .filter(Boolean);
        if (codes.length === 0) {
          setMessage("Provide at least one product code.");
          return;
        }
        const { txHash, productIdHashes } = await mintBatchOnChain(
          { ...walletClient, account: walletClient.account! },
          { batchCode, productCodes: codes },
        );
        setMessage(`Minted ${productIdHashes.length} products. tx=${txHash}`);
        return;
      }

      if (mode === "bindTag") {
        const { txHash, productIdHash, tagIdHash } = await bindTagOnChain(
          { ...walletClient, account: walletClient.account! },
          { productCode, tagUid },
        );
        setMessage(`Tag bound. product=${productIdHash} tag=${tagIdHash} tx=${txHash}`);
        return;
      }

      const batch = await readBatch(deriveOnChainId(batchCode));
      const product = await readProduct(deriveOnChainId(productCode));
      const tag = await readTag(deriveOnChainId(tagUid.trim().toUpperCase()));
      setMessage(
        JSON.stringify(
          {
            batchCode,
            batch,
            productCode,
            product,
            tagUid,
            tag,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transaction failed");
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
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Team 1 Registry</h1>
            <p className="mt-2 text-sm text-gray-500">
              Batch / mint / NFC bind against VeriChainRegistry. Authorization comes from Supabase
              role_permissions; on-chain writes still require the registry owner.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>{authMessage}</span>
              {isConnected && !onHedera && (
                <button
                  type="button"
                  disabled={isSwitching}
                  onClick={() => switchChain({ chainId: hedera.id })}
                  className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 font-medium text-amber-800 disabled:opacity-40"
                >
                  {isSwitching ? "Switching…" : "Switch MetaMask to Hedera Testnet"}
                </button>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {(
                [
                  ["createBatch", "Create batch"],
                  ["mintBatch", "Mint products"],
                  ["bindTag", "Bind NFC tag"],
                  ["lookup", "Lookup"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    mode === value ? "border-black bg-black text-white" : "border-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-8 rounded-xl border border-gray-200 p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {(mode === "createBatch" || mode === "mintBatch" || mode === "lookup") && (
                  <Field label="Batch code" value={batchCode} setValue={setBatchCode} />
                )}
                {mode === "createBatch" && (
                  <Field label="Quantity" value={quantity} setValue={setQuantity} numeric />
                )}
                {mode === "mintBatch" && (
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400 sm:col-span-2">
                    Product codes (comma or newline)
                    <textarea
                      value={productCodes}
                      onChange={(event) => setProductCodes(event.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm normal-case tracking-normal text-black outline-none focus:border-black"
                    />
                  </label>
                )}
                {(mode === "bindTag" || mode === "lookup") && (
                  <Field label="Product code" value={productCode} setValue={setProductCode} />
                )}
                {(mode === "bindTag" || mode === "lookup") && (
                  <Field label="NFC tag UID" value={tagUid} setValue={setTagUid} />
                )}
              </div>

              <button
                className="mt-6 flex items-center gap-2 rounded-lg bg-black px-4 py-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Factory size={14} />
                {mode === "lookup" ? "Read registry" : "Submit owner transaction"}
              </button>
              {message && (
                <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words text-xs text-gray-500">
                  {message}
                </pre>
              )}
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
