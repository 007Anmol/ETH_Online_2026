"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Handshake } from "lucide-react";
import { formatEther, isAddress, parseEther } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import StatusBadge from "@/components/team2/StatusBadge";
import { CONTRACTS } from "@/lib/contracts";
import { useHederaWrite } from "@/lib/blockchain/useHederaWrite";
import {
  ESCROW_STATUS,
  PRODUCT_STATUS,
  SHIPMENT_STATUS,
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
import { escrowAbi } from "@/lib/escrowAbi";
import { DEMO_PRODUCT } from "@/lib/demoProduct";

type LogisticsProduct = readonly [team1Hash: `0x${string}`, custodian: `0x${string}`, status: number, exists: boolean];

export default function SettlementPage() {
  const { address, isConnected } = useAccount();
  const [productId, setProductId] = useState<string>(DEMO_PRODUCT.logisticsId);
  const [receiver, setReceiver] = useState("");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [message, setMessage] = useState("");
  const [ownershipTx, setOwnershipTx] = useState("");
  const [paymentTx, setPaymentTx] = useState("");
  const [createTx, setCreateTx] = useState("");
  const [saleShipment, setSaleShipment] = useState<OnChainShipment | null>(null);
  const [matchedEscrow, setMatchedEscrow] = useState<{ id: bigint; row: OnChainEscrow } | null>(null);

  const tokenId = useMemo(() => {
    try {
      return BigInt(productId || "0");
    } catch {
      return 0n;
    }
  }, [productId]);

  const { data: logistics, refetch: refetchProduct } = useReadContract({
    address: CONTRACTS.supplyChain,
    abi: legacySupplyChainAbi,
    functionName: "products",
    args: [tokenId],
    query: { enabled: tokenId > 0n },
  });
  const { data: nextEscrowId, refetch: refetchNextEscrow } = useReadContract({
    address: CONTRACTS.escrow,
    abi: escrowAbi,
    functionName: "nextEscrowId",
  });

  const { writeHederaContract, data: hash, isPending, error } = useHederaWrite();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const product = logistics as LogisticsProduct | undefined;
  const escrowId = matchedEscrow?.id ?? 0n;
  const escrowRecord = matchedEscrow?.row;
  const productExists = product?.[3] === true;
  const productStatus = product ? PRODUCT_STATUS[product[2]] ?? "UNKNOWN" : "MISSING";
  const owner = productExists ? product[1] : undefined;
  const flagged = product?.[2] === 3;
  const inTransit = product?.[2] === 1;
  const delivered = product?.[2] === 2;
  const escrowStatus = escrowRecord ? ESCROW_STATUS[escrowRecord[4]] : "EMPTY";
  const escrowOpen = escrowStatus === "ACTIVE" || escrowStatus === "FROZEN";
  const shipmentRecord = saleShipment;
  const shipmentStatus = shipmentRecord?.[5] ? SHIPMENT_STATUS[shipmentRecord[4]] : "NONE";
  const connectedIsOwner = Boolean(owner && address && owner.toLowerCase() === address.toLowerCase());
  const canCreateEscrow = Boolean(productExists && delivered && !inTransit && !flagged && !escrowOpen);
  const canShipToBuyer = connectedIsOwner && escrowStatus === "ACTIVE" && !inTransit && !flagged;
  const canAccept = Boolean(shipmentRecord?.[5] && shipmentRecord[4] !== 2 && escrowStatus === "ACTIVE");

  const refreshShipment = async () => {
    if (tokenId <= 0n) return;
    try {
      setSaleShipment(await findLatestShipmentForProduct(tokenId));
    } catch {
      setSaleShipment(null);
    }
  };

  const refreshEscrow = async () => {
    if (tokenId <= 0n) {
      setMatchedEscrow(null);
      return;
    }
    try {
      setMatchedEscrow(await findLatestEscrowForProduct(tokenId));
    } catch {
      setMatchedEscrow(null);
    }
  };

  const refresh = () => {
    void refetchProduct();
    void refetchNextEscrow();
    void refreshShipment();
    void refreshEscrow();
  };

  useEffect(() => {
    void refreshShipment();
    void refreshEscrow();
  }, [tokenId, hash]);

  useEffect(() => {
    if (owner) setPayee(owner);
  }, [owner]);

  const afterTx = (kind: "ownership" | "payment" | "create", tx: `0x${string}`) => {
    if (kind === "ownership") setOwnershipTx(tx);
    if (kind === "payment") setPaymentTx(tx);
    if (kind === "create") setCreateTx(tx);
    refresh();
  };

  const fundEscrow = (event: FormEvent) => {
    event.preventDefault();
    if (!isConnected) return setMessage("Connect the buyer wallet that will lock HBAR.");
    if (!canCreateEscrow) {
      if (inTransit) return setMessage("Wait until the current receiver clicks I received it.");
      if (escrowOpen) return setMessage("This product already has locked money. Finish this sale first.");
      if (flagged) return setMessage("This product is flagged. Sale is blocked.");
      return setMessage("The current owner must already have the product before a sale starts.");
    }
    if (!isAddress(payee)) return setMessage("Enter the current owner wallet. They get paid.");
    void writeHederaContract(
      {
        address: CONTRACTS.escrow,
        abi: escrowAbi,
        functionName: "createEscrow",
        args: [tokenId, payee],
        value: parseEther(amount),
      },
      {
        onSuccess: (tx) => {
          afterTx("create", tx);
          void fetch("/api/escrow", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: (nextEscrowId ?? 1n).toString(),
              product_id: productId,
              amount: parseEther(amount).toString(),
              currency: "HBAR",
              status: "LOCKED",
              chain_tx_hash: tx,
              buyer_org_id: address,
              seller_org_id: payee,
            }),
          }).catch(() => {});
          setMessage(`Buyer locked ${amount} HBAR. Owner can now send the product.`);
        },
        onError: (err) => setMessage(err.message),
      },
    );
  };

  const createShipment = (event: FormEvent) => {
    event.preventDefault();
    if (!canShipToBuyer) {
      return setMessage("Connect the current owner. Money must already be locked.");
    }
    if (!isAddress(receiver)) return setMessage("Enter the buyer wallet.");
    void writeHederaContract(
      {
        address: CONTRACTS.supplyChain,
        abi: legacySupplyChainAbi,
        functionName: "createShipment",
        args: [tokenId, receiver],
      },
      {
        onSuccess: (tx) => {
          afterTx("create", tx);
          void fetch("/api/products/sync", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "inTransit", tokenId: Number(productId), txHash: tx }),
          }).catch(() => {});
          setMessage("Sent. Owner does not change until the buyer clicks I received it.");
        },
        onError: (err) => setMessage(err.message),
      },
    );
  };

  const acceptShipment = () => {
    if (!shipmentRecord?.[5]) return setMessage("Nothing to receive yet.");
    const pendingEscrowId = escrowId;
    const shipment = shipmentRecord;

    void (async () => {
      const tx = await writeHederaContract(
        {
          address: CONTRACTS.supplyChain,
          abi: legacySupplyChainAbi,
          functionName: "acceptShipment",
          args: [shipment[0]],
        },
        { onError: (err) => setMessage(err.message) },
      );
      if (!tx) return;

      afterTx("ownership", tx);
      void fetch("/api/products/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "ownership",
          tokenId: Number(productId),
          from: shipment[2],
          to: address,
          txHash: tx,
          leg: "sale",
        }),
      });

      if (pendingEscrowId <= 0n) {
        setMessage("Received. This wallet is now the owner.");
        return;
      }

      setMessage("Received. Confirm the next wallet prompt to pay the seller.");
      const payTx = await writeHederaContract(
        {
          address: CONTRACTS.escrow,
          abi: escrowAbi,
          functionName: "releaseEscrow",
          args: [pendingEscrowId],
        },
        {
          onError: (err) => setMessage(`Received, but payment failed: ${err.message}`),
        },
      );
      if (!payTx) return;

      afterTx("payment", payTx);
      void fetch("/api/escrow", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: pendingEscrowId.toString(),
          status: "RELEASED",
          chain_tx_hash: payTx,
        }),
      }).catch(() => {});
      setMessage("Received and paid. You own the product and can sell it again.");
    })();
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="mx-auto max-w-350 p-6 lg:p-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Paid sale</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sale</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              Retailer sells to a buyer. After that, the buyer can sell to another buyer. Money is locked first. The
              owner only changes when the buyer clicks I received it. That same click pays the seller.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Unpaid hops stay on{" "}
              <Link className="underline" href="/shipments">
                Logistics
              </Link>
              . Full history is on{" "}
              <Link className="underline" href={`/product/${productId}`}>
                Product history
              </Link>
              .
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-5 md:items-center">
              <Step title="Who has it now" subtitle={shortAddr(owner)} />
              <Arrow />
              <Step title="Buyer locking money" subtitle={escrowRecord ? shortAddr(escrowRecord[1]) : "—"} />
              <Arrow />
              <Step title="Seller getting paid" subtitle={escrowRecord ? shortAddr(escrowRecord[2]) : "—"} />
            </div>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Product</p>
                    <h2 className="mt-2 text-xl font-semibold">#{productId}</h2>
                  </div>
                  <StatusBadge status={inTransit ? "IN TRANSIT" : productStatus} />
                </div>
                <dl className="mt-6 space-y-3 text-sm">
                  <Row label="Current owner" value={owner} href={owner ? hashscanAddress(owner) : undefined} />
                  <Row
                    label="Latest send"
                    value={shipmentRecord?.[5] ? `${shipmentRecord[0].toString()} · ${shipmentStatus}` : "None yet"}
                  />
                  <Row
                    label="Receive tx"
                    value={ownershipTx || "Owner changes only after I received it"}
                    href={ownershipTx ? hashscanTx(ownershipTx) : undefined}
                  />
                </dl>
                <Field label="Product id" value={productId} setValue={setProductId} />
              </div>

              <div className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Locked money</p>
                    <h2 className="mt-2 text-xl font-semibold">
                      {escrowId > 0n ? `Escrow #${escrowId.toString()}` : "No sale yet"}
                    </h2>
                  </div>
                  <StatusBadge status={escrowStatus === "ACTIVE" ? "LOCKED" : escrowStatus} />
                </div>
                <dl className="mt-6 space-y-3 text-sm">
                  <Row
                    label="Buyer"
                    value={escrowRecord ? escrowRecord[1] : "—"}
                    href={escrowRecord ? hashscanAddress(escrowRecord[1]) : undefined}
                  />
                  <Row
                    label="Seller"
                    value={escrowRecord ? escrowRecord[2] : "—"}
                    href={escrowRecord ? hashscanAddress(escrowRecord[2]) : undefined}
                  />
                  <Row
                    label="Amount"
                    value={
                      escrowRecord && escrowRecord[4] !== 2
                        ? `${formatEther(escrowRecord[3])} HBAR`
                        : escrowStatus === "RELEASED"
                          ? "Released"
                          : "—"
                    }
                  />
                  <Row
                    label="Payout tx"
                    value={paymentTx || (escrowStatus === "RELEASED" ? "Released" : "Pays when buyer receives")}
                    href={paymentTx ? hashscanTx(paymentTx) : undefined}
                  />
                  <Row label="Lock tx" value={createTx || "—"} href={createTx ? hashscanTx(createTx) : undefined} />
                </dl>
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <form onSubmit={fundEscrow} className="rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold">1. Buyer locks money</h3>
                <p className="mt-2 text-xs text-gray-500">
                  Connect the buyer. Pay the current owner. After a sale finishes, the new owner can sell again.
                </p>
                <Field label="Pay this owner" value={payee} setValue={setPayee} />
                <Field label="Amount (HBAR)" value={amount} setValue={setAmount} />
                <button
                  disabled={isPending || isConfirming || !canCreateEscrow}
                  className="mt-4 w-full rounded-lg bg-black px-4 py-2.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  Lock HBAR
                </button>
              </form>

              <form onSubmit={createShipment} className="rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold">2. Owner sends, buyer receives</h3>
                <p className="mt-2 text-xs text-gray-500">
                  Sending does not change owner. When the buyer clicks I received it, they become owner and the seller is paid.
                </p>
                <Field label="Send to this buyer" value={receiver} setValue={setReceiver} />
                <button
                  disabled={isPending || isConfirming || !canShipToBuyer}
                  className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-xs font-medium hover:border-black disabled:opacity-40"
                >
                  Send product
                </button>
                <button
                  type="button"
                  onClick={acceptShipment}
                  disabled={isPending || isConfirming || !canAccept}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  <Handshake size={14} />
                  I received it
                </button>
              </form>
            </section>

            {(message || error) && (
              <pre className="mt-6 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-gray-200 p-4 text-xs text-gray-600">
                {error?.message || message}
                {hash && (
                  <>
                    {"\n"}
                    <a className="inline-flex items-center gap-1 underline" href={hashscanTx(hash)} target="_blank" rel="noreferrer">
                      Latest tx on HashScan <ExternalLink size={10} />
                    </a>
                  </>
                )}
              </pre>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Step({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-6">
      <p className="text-[10px] uppercase tracking-wider text-gray-400">{title}</p>
      <p className="mt-2 font-mono text-xs">{subtitle}</p>
    </div>
  );
}

function Arrow() {
  return <ArrowRight className="hidden justify-self-center text-gray-300 md:block" size={18} />;
}

function Field({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
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
          value ?? "—"
        )}
      </dd>
    </div>
  );
}

function shortAddr(value?: string) {
  if (!value) return "—";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
