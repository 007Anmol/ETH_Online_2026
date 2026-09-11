"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Cpu,
  Fingerprint,
  Radio,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import Sidebar from "@/components/team2/Sidebar";
import Topbar from "@/components/team2/Topbar";
import {
  deriveOnChainId,
  hasRegistryAddress,
  normalizeTagUid,
  readProduct,
  readRegistryOwner,
  readTag,
  type OnChainProduct,
  type OnChainTag,
} from "@/lib/blockchain";

export default function VerificationPage() {
  const [productCode, setProductCode] = useState("VC-RADO2026001-000001");
  const [tagUid, setTagUid] = useState("04DEADBEEF01");
  const [owner, setOwner] = useState<string>("");
  const [product, setProduct] = useState<OnChainProduct | null>(null);
  const [tag, setTag] = useState<OnChainTag | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!hasRegistryAddress()) {
        if (!cancelled) setError("NEXT_PUBLIC_REGISTRY_ADDRESS is not configured.");
        return;
      }
      try {
        const [registryOwner, onChainProduct, onChainTag] = await Promise.all([
          readRegistryOwner(),
          readProduct(deriveOnChainId(productCode)),
          readTag(deriveOnChainId(normalizeTagUid(tagUid))),
        ]);
        if (cancelled) return;
        setOwner(registryOwner);
        setProduct(onChainProduct);
        setTag(onChainTag);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Registry read failed");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [productCode, tagUid]);

  const bound =
    product?.exists &&
    tag?.exists &&
    product.boundTagIdHash.toLowerCase() === deriveOnChainId(normalizeTagUid(tagUid)).toLowerCase();

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <Topbar />

          <main className="mx-auto max-w-[1100px] p-6 lg:p-10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Agent</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Product Verification</h1>
              <p className="mt-2 text-sm text-gray-500">
                Read Team 1 product/tag binding from VeriChainRegistry. NFC cryptographic verify and
                consumeNonce remain owner/backend flows.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
              <section className="rounded-xl border border-gray-200 p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400">
                    Product code
                    <input
                      value={productCode}
                      onChange={(event) => setProductCode(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm normal-case tracking-normal text-black outline-none focus:border-black"
                    />
                  </label>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-400">
                    Tag UID
                    <input
                      value={tagUid}
                      onChange={(event) => setTagUid(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm normal-case tracking-normal text-black outline-none focus:border-black"
                    />
                  </label>
                </div>

                <div className="mt-8 flex min-h-[240px] flex-col items-center justify-center text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-200">
                    <ScanLine className="text-gray-400" size={32} />
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {bound ? "Product ↔ tag bound" : "Binding not confirmed"}
                  </h2>
                  <p className="mt-2 max-w-sm text-sm text-gray-500">
                    {error ||
                      (bound
                        ? "On-chain Team 1 identity matches the entered product and tag."
                        : "Enter a minted product code and bound tag UID to verify identity.")}
                  </p>
                </div>
              </section>

              <aside className="space-y-4">
                <InfoCard
                  icon={<ShieldCheck size={16} />}
                  title="Registry owner"
                  body={owner || "Unavailable"}
                />
                <InfoCard
                  icon={<Fingerprint size={16} />}
                  title="Product exists"
                  body={product ? String(product.exists) : "—"}
                />
                <InfoCard
                  icon={<Radio size={16} />}
                  title="Tag status"
                  body={tag ? String(tag.status) : "—"}
                />
                <InfoCard
                  icon={<Cpu size={16} />}
                  title="Bound"
                  body={bound ? "YES" : "NO"}
                />
                <InfoCard
                  icon={<CheckCircle2 size={16} />}
                  title="consumeNonce"
                  body="Owner-only backend action — not callable by logistics wallets"
                />
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.15em]">{title}</p>
      </div>
      <p className="mt-2 break-all text-sm text-black">{body}</p>
    </div>
  );
}
