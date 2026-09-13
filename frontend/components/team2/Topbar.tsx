"use client";

import { Bell, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { hedera } from "@/lib/blockchain/wagmi";
import { Button } from "@/components/ui/Button";

export default function Topbar() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const onHedera = chainId === hedera.id;

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
      connect({ connector, chainId: hedera.id });
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-6 lg:px-8">
      <div>
        <p className="eyebrow">
          Supply Chain Network
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" className="h-9 w-9 rounded-lg p-0" aria-label="Notifications">
          <Bell size={15} />
        </Button>

        {mounted && isConnected && !onHedera && (
          <Button
            variant="outline"
            onClick={() => switchChain({ chainId: hedera.id })}
          >
            Switch to Hedera 296
          </Button>
        )}

        <Button
          onClick={toggleWallet}
        >
          <Wallet size={14} />
          {mounted && isConnected && address
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : "Connect Wallet"}
        </Button>
      </div>
    </header>
  );
}