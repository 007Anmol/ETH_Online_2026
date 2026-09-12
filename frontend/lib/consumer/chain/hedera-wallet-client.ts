"use client";

import { createWalletClient, custom, defineChain, type Address, type WalletClient } from "viem";

/**
 * Hedera testnet, defined once for client-side use — must match
 * @verichain/shared's HEDERA_TESTNET_CHAIN_ID/RPC_URL (server-side constant,
 * not importable into a "use client" bundle the same way, so the two literal
 * values are kept in sync manually; see CONSUMER_BACKEND_PLAN.md).
 */
export const HEDERA_TESTNET = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hashio.io/api"] } },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/testnet" },
  },
});

/**
 * Minimal shape of what we need from a Privy `ConnectedWallet` — kept local
 * (rather than importing the full Privy type here) so this module has no
 * hard dependency on the exact Privy SDK version wiring it in.
 */
export type EthereumWalletLike = {
  address: string;
  chainId?: string;
  getEthereumProvider: () => Promise<unknown>;
  switchChain?: (chainId: number) => Promise<void>;
};

export class WrongNetworkError extends Error {
  constructor() {
    super("Wallet is not on Hedera Testnet (chain id 296). Switch networks and try again.");
    this.name = "WrongNetworkError";
  }
}

/**
 * Builds a real viem WalletClient wrapping the connected browser wallet's
 * own EIP-1193 provider — every transaction sent through it is signed by
 * the user's actual wallet, never by a server-held key. Attempts to switch
 * the wallet to Hedera Testnet first; if the wallet can't/won't, surfaces a
 * clear WrongNetworkError rather than silently sending to the wrong chain.
 */
export async function getWalletClient(wallet: EthereumWalletLike): Promise<WalletClient> {
  if (wallet.switchChain) {
    try {
      await wallet.switchChain(HEDERA_TESTNET.id);
    } catch {
      throw new WrongNetworkError();
    }
  }

  const provider = await wallet.getEthereumProvider();

  return createWalletClient({
    account: wallet.address as Address,
    chain: HEDERA_TESTNET,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: custom(provider as any),
  });
}
