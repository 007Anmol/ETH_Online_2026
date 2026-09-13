"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Plus, RefreshCw, Search, Truck } from "lucide-react";
import { isAddress } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import StatusBadge from "@/components/team2/StatusBadge";
import { CONTRACTS } from "@/lib/contracts";
import { deriveOnChainId, isTagBound, readProduct } from "@/lib/blockchain";
import { PRODUCT_STATUS } from "@/lib/blockchain/explorer";
import { findLatestShipmentForProduct, type OnChainShipment } from "@/lib/blockchain/supplyChainReads";
import { useHederaWrite } from "@/lib/blockchain/useHederaWrite";
import { legacySupplyChainAbi } from "@/lib/team2/legacySupplyChainAbi";
import {
  createShipmentRecord,
  fetchDirectory,
  fetchShipments,
  type OrganizationRecord,
  type ProductRecord,
  updateShipmentRecord,
  type ShipmentRecord as DbShipmentRecord,
} from "@/lib/supabase";
import { DEMO_PRODUCT } from "@/lib/demoProduct";

/** Team 2 supply-chain contract boundary (not Team 1 identity registry). */
const supplyChainAddress = CONTRACTS.supplyChain;

const shipmentStatuses = ["CREATED", "IN_TRANSIT", "RECEIVED", "CANCELLED"] as const;

export default function ShipmentsPage() {
  const { address: userAddress, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [productId, setProductId] = useState<string>(DEMO_PRODUCT.logisticsId);
  const [team1ProductCode, setTeam1ProductCode] = useState<string>(DEMO_PRODUCT.productCode);
  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");
  const [dbShipments, setDbShipments] = useState<DbShipmentRecord[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [matchedShipment, setMatchedShipment] = useState<OnChainShipment | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);

  const { data: logistics, refetch: refetchProduct } = useReadContract({
    address: supplyChainAddress,
    abi: legacySupplyChainAbi,
    functionName: "products",
    args: [BigInt(productId || "0")],
    query: { enabled: Boolean(supplyChainAddress) && Boolean(productId) },
  });
  const { data: nextShipmentId } = useReadContract({
    address: supplyChainAddress,
    abi: legacySupplyChainAbi,
    functionName: "nextShipmentId",
    query: { enabled: Boolean(supplyChainAddress) },
  });

  const { writeHederaContract, data: transactionHash, isPending } = useHederaWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: transactionHash });

  const record = matchedShipment;
  const shipmentExists = record?.[5] === true;
  const status = record ? shipmentStatuses[record[4]] ?? "UNKNOWN" : "EMPTY";
  const shipmentId = record?.[0] ?? 0n;
  const logisticsProduct = logistics as readonly [`0x${string}`, `0x${string}`, number, boolean] | undefined;
  const productExists = logisticsProduct?.[3] === true;
  const currentCustodian = productExists ? logisticsProduct[1] : undefined;
  const productStatus = logisticsProduct ? PRODUCT_STATUS[logisticsProduct[2]] ?? "UNKNOWN" : "MISSING";
  const inTransit = logisticsProduct?.[2] === 1;
  const received = shipmentExists && status === "RECEIVED";
  const organizationName = (value?: string | null) => {
    if (!value) return "Unknown organization";
    const match = organizations.find((organization) => organization.id.toLowerCase() === value.toLowerCase() || organization.wallet_address.toLowerCase() === value.toLowerCase());
    return match?.name ?? value;
  };

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

  const loadMatchedShipment = async () => {
    try {
      const token = BigInt(productId || "0");
      if (token <= 0n) {
        setMatchedShipment(null);
        return;
      }
      setMatchedShipment(await findLatestShipmentForProduct(token));
    } catch {
      setMatchedShipment(null);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void loadDbShipments();
    void fetchDirectory().then(({ organizations: organizationRows, products: productRows }) => {
      setOrganizations(organizationRows);
      const mintedProducts = productRows.filter((product) => product.token_id !== null);
      setProducts(mintedProducts);
      const latestProduct = mintedProducts[0];
      if (latestProduct) {
        setTeam1ProductCode(latestProduct.product_code);
        setProductId(String(latestProduct.token_id));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    void loadMatchedShipment();
  }, [productId, transactionHash]);

  useEffect(() => {
    if (isSuccess && transactionHash) {
      void loadMatchedShipment();
      void refetchProduct();
      void loadDbShipments();
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

    void writeHederaContract(
      {
        address: supplyChainAddress,
        abi: legacySupplyChainAbi,
        functionName: "createShipment",
        args: [BigInt(productId), receiver],
      },
      {
        onSuccess: (hash) => {
          setMessage("Sent. Owner does not change until the receiver clicks I received it.");
          if (nextShipmentId && userAddress) {
            createShipmentRecord({
              id: nextShipmentId.toString(),
              on_chain_shipment_id: nextShipmentId.toString(),
              product_id: productId,
              sender_org_id: userAddress,
              receiver_org_id: receiver,
              status: "IN_TRANSIT",
              chain_tx_hash: hash,
            }).catch(() => {});
          }
          void fetch("/api/products/sync", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "inTransit", tokenId: Number(productId), txHash: hash }),
          }).finally(() => {
            void refetchProduct();
            void loadDbShipments();
          });
        },
        onError: (error) => setMessage(error.message),
      }
    );
  };

  const acceptShipment = () => {
    if (!record) return;

    void writeHederaContract(
      {
        address: supplyChainAddress,
        abi: legacySupplyChainAbi,
        functionName: "acceptShipment",
        args: [record[0]],
      },
      {
        onSuccess: (hash) => {
          setMessage("Received. This wallet is now the owner. You can send it again, or go to Sale.");
          updateShipmentRecord(record[0].toString(), {
            status: "RECEIVED",
            chain_tx_hash: hash,
          }).catch(() => {});
          void fetch("/api/products/sync", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: "ownership",
              tokenId: Number(record[1]),
              from: record[2],
              to: userAddress,
              txHash: hash,
              leg: "logistics",
            }),
          }).finally(() => {
            void refetchProduct();
            void loadDbShipments();
          });
        },
        onError: (error) => setMessage(error.message),
      }
    );
  };

  const registerLogisticsProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!isConnected || !userAddress) {
      setMessage("Connect the supply-chain owner wallet first.");
      return;
    }
    if (!supplyChainAddress || supplyChainAddress === "0x0000000000000000000000000000000000000000") {
      setMessage("Set NEXT_PUBLIC_SUPPLY_CHAIN_ADDRESS after DeployTeam2.");
      return;
    }

    const team1Hash = deriveOnChainId(team1ProductCode);
    void (async () => {
      try {
        const identity = await readProduct(team1Hash);
        if (!identity.exists) {
          setMessage(
            `Team 1 product "${team1ProductCode}" is not minted. Mint it on Manufacturing first.`,
          );
          return;
        }
        if (!isTagBound(identity)) {
          setMessage(
            `Team 1 tag not bound for "${team1ProductCode}". Open Manufacturing → Bind NFC tag with an unused tag UID, then register again.`,
          );
          return;
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Team 1 lookup failed");
        return;
      }

      void writeHederaContract(
      {
        address: supplyChainAddress,
        abi: legacySupplyChainAbi,
        functionName: "registerLogisticsProduct",
        args: [BigInt(productId), team1Hash, userAddress],
      },
      {
        onSuccess: async (hash) => {
          try {
            const synced = await fetch("/api/products/sync", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                action: "linkLogistics",
                productCode: team1ProductCode,
                tokenId: Number(productId),
                txHash: hash,
                custodian: userAddress,
              }),
            });
            const body = (await synced.json().catch(() => ({}))) as { error?: string; product?: { token_id?: number } };
            if (!synced.ok) {
              setMessage(`On-chain link submitted (${hash.slice(0, 10)}...) but Supabase sync failed: ${body.error}`);
              return;
            }
            setMessage(
              `Linked ${team1ProductCode} → logistics #${productId} and set products.token_id=${body.product?.token_id}. Tx: ${hash}`,
            );
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Logistics link sync failed");
          }
        },
        onError: (error) => setMessage(error.message),
      },
    );
    })();
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
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">No payment</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Logistics</h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-500">
                  Send the product to a distributor, then another, then a retailer. The owner only changes when the
                  receiver clicks I received it. Repeat as many times as you want.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/product/${productId}`} className="text-xs underline">
                  Product history
                </Link>
                <Link href={`/checkpoints?productId=${productId}`} className="text-xs underline">
                  Run telemetry check
                </Link>
                <StatusBadge status={mounted && isConnected ? "CONNECTED" : "PENDING"} />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-gray-200 p-4 text-sm">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Who has it now</p>
              <p className="mt-1 font-mono text-xs">{currentCustodian ?? "Not in logistics yet"}</p>
              <p className="mt-2 text-xs text-gray-500">
                {inTransit
                  ? "Waiting for the receiver to click I received it."
                  : received
                    ? "Receiver has it. Current owner can send it to the next person."
                    : productExists
                      ? "Ready to send."
                      : "Register this product once, then send."}
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
              <form onSubmit={registerLogisticsProduct} className="rounded-xl border border-dashed border-gray-300 p-6 lg:col-span-2">
                <h2 className="text-sm font-semibold">1) Register once</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Use the manufacturer wallet. Product must already be minted and tagged on Manufacturing.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400">
                    Logistics product id
                    <input
                      value={productId}
                      onChange={(event) => setProductId(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
                      inputMode="numeric"
                    />
                  </label>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400 sm:col-span-2">
                    Team 1 product code
                    <select
                      value={team1ProductCode}
                      onChange={(event) => {
                        const selected = products.find((product) => product.product_code === event.target.value);
                        setTeam1ProductCode(event.target.value);
                        if (selected?.token_id !== null && selected?.token_id !== undefined) setProductId(String(selected.token_id));
                      }}
                      className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
                    >
                      {products.length === 0 && <option value={team1ProductCode}>{team1ProductCode} · directory unavailable</option>}
                      {products.map((product) => <option key={product.id} value={product.product_code}>{product.product_code} · {product.batch?.product_name ?? "Minted product"} · token {product.token_id}</option>)}
                    </select>
                  </label>
                </div>
                <button
                  disabled={isPending || isConfirming}
                  className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium hover:border-black disabled:opacity-40"
                >
                  Register logistics product
                </button>
              </form>

              {/* Shipment Creation Form */}
              <form onSubmit={submitCreate} className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2">
                  <Plus size={15} />
                  <h2 className="text-sm font-semibold">2) Send</h2>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Connect the current owner. Sending does not change owner until the other wallet clicks I received it.
                </p>

                <label className="mt-6 block text-[10px] uppercase tracking-wider text-gray-400">Product ID</label>
                <input
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
                  inputMode="numeric"
                />

                <label className="mt-4 block text-[10px] uppercase tracking-wider text-gray-400">Send to this wallet</label>
                <input
                  value={receiver}
                  onChange={(event) => setReceiver(event.target.value)}
                  placeholder="Distributor, retailer, or next hop — 0x..."
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs outline-none focus:border-black"
                />

                <button
                  disabled={isPending || isConfirming || inTransit || !productExists}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Truck size={14} />
                  {isPending || isConfirming ? "Confirming..." : "Send product"}
                </button>

                {message && <p className="mt-4 wrap-break-word text-xs text-gray-500">{message}</p>}
              </form>

              {/* Latest On-chain Record */}
              <section className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Latest on-chain record</p>
                    <h2 className="mt-2 text-xl font-semibold">Shipment #{shipmentId.toString()}</h2>
                    <Link href={`/product/${productId}`} className="mt-1 inline-block text-xs underline underline-offset-2">
                      Open product details
                    </Link>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={inTransit ? "IN TRANSIT" : received ? "RECEIVED" : shipmentExists ? status : "PENDING"} />
                    <StatusBadge status={productStatus} />
                  </div>
                </div>

                {shipmentExists && record ? (
                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <Detail label="Product" value={`#${record[1].toString()}`} />
                    <Detail label="Shipment status" value={inTransit ? "IN TRANSIT" : status} />
                    <Detail label="Sent from" value={`${organizationName(record[2])} · ${record[2]}`} mono />
                    <Detail label="Sent to" value={`${organizationName(record[3])} · ${record[3]}`} mono />
                    <Detail
                      label="Current owner"
                      value={
                        received
                          ? currentCustodian ?? record[3]
                          : currentCustodian ?? "Still the sender until I received it"
                      }
                      mono
                    />
                    <Detail label="Payment" value="None on this page. Sale is a separate step." />
                  </div>
                ) : (
                  <div className="mt-12 flex flex-col items-center justify-center text-center text-gray-400">
                    <Search size={22} />
                    <p className="mt-3 text-sm">No shipment found yet on chain.</p>
                    {productExists && currentCustodian && (
                      <p className="mt-2 font-mono text-xs text-gray-500">Current owner: {currentCustodian}</p>
                    )}
                  </div>
                )}

                {shipmentExists && status !== "RECEIVED" && (
                  <button
                    onClick={acceptShipment}
                    disabled={isPending || isConfirming}
                    className="mt-8 flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-xs font-medium hover:border-black disabled:opacity-40"
                  >
                    <Check size={14} /> I received it
                  </button>
                )}
                {received && (
                  <p className="mt-6 text-xs text-gray-500">
                    This wallet owns it. Send it again, or go to{" "}
                    <Link className="underline" href="/settlement">Sale</Link> when a retailer is selling to a buyer.
                  </p>
                )}
              </section>
            </div>

            {/* Database-Backed Shipments History */}
            <section className="mt-8 rounded-xl border border-gray-200 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Past sends</h2>
                  <p className="text-xs text-gray-400">Each hop. Owner changes only after I received it.</p>
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
                          <td className="py-3"><span className="font-medium">{organizationName(s.sender_org_id)}</span><span className="block font-mono text-[10px] text-gray-400">{s.sender_org_id?.slice(0, 10) ?? "—"}</span></td>
                          <td className="py-3"><span className="font-medium">{organizationName(s.receiver_org_id)}</span><span className="block font-mono text-[10px] text-gray-400">{s.receiver_org_id?.slice(0, 10) ?? "—"}</span></td>
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
                            {mounted && s.created_at
                              ? new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : "—"}
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
