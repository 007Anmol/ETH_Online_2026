"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { HEDERA_TESTNET } from "@/lib/consumer/chain/hedera-wallet-client";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID");
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["wallet"],
        // Without this, Privy's own SDK rejects switchChain(296) with
        // "Unsupported chainId: 296" before the request ever reaches
        // MetaMask's RPC — Privy validates against its configured chain
        // list, not just what the connected wallet itself supports.
        supportedChains: [HEDERA_TESTNET],
        defaultChain: HEDERA_TESTNET,
        appearance: {
          theme: "dark",
          accentColor: "#10b981",
          logo: undefined,
          walletChainType: "ethereum-only",
        },
        externalWallets: {
          walletConnect: {
            enabled: true,
          },
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}