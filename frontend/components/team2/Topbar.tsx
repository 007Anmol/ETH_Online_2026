"use client";

import { Bell, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function Topbar() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleWallet = () => {
    if (isConnected) {
      disconnect();
      return;
    }

    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 lg:px-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
          Supply Chain Network
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-black hover:text-black">
          <Bell size={15} />
        </button>

        <button
          onClick={toggleWallet}
          className="flex items-center gap-2 rounded-lg bg-black px-3.5 py-2 text-xs font-medium text-white transition hover:bg-gray-800"
        >
          <Wallet size={14} />
          {mounted && isConnected && address
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : "Connect Wallet"}
        </button>
      </div>
    </header>
  );
}